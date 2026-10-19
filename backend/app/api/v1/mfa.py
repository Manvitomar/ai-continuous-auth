import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.session import UserSession, AuditLog
from app.schemas.mfa import TOTPSetupResponse, TOTPVerifyRequest, TOTPVerifyResponse
from app.core.security import (
    generate_totp_secret,
    get_totp_uri,
    generate_qr_code_base64,
    verify_totp_code
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/mfa", tags=["Multi-Factor Authentication"])

@router.post("/setup", response_model=TOTPSetupResponse)
def setup_totp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new TOTP secret, authenticator URI, and QR code for enrollment.
    Also generates 5 emergency backup recovery codes.
    """
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.username)
    qr_code = generate_qr_code_base64(uri)
    
    # Generate 5 backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(5)]
    
    # Store pending secret & backup codes
    current_user.totp_secret = secret
    current_user.backup_codes = ",".join(backup_codes)
    db.commit()

    return TOTPSetupResponse(
        secret=secret,
        provisioning_uri=uri,
        qr_code_base64=qr_code,
        backup_codes=backup_codes
    )

@router.post("/enable", response_model=TOTPVerifyResponse)
def enable_totp(
    verify_in: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify first code to officially activate TOTP for account."""
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP setup has not been initialized. Call /mfa/setup first."
        )

    is_valid = verify_totp_code(current_user.totp_secret, verify_in.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code. Please check your authenticator clock."
        )

    current_user.totp_enabled = True
    
    audit = AuditLog(
        user_id=current_user.id,
        event_type="MFA_ENABLED",
        details="TOTP multi-factor authentication successfully enabled."
    )
    db.add(audit)
    db.commit()

    return TOTPVerifyResponse(
        verified=True,
        message="TOTP Multi-Factor Authentication is now enabled.",
        risk_score_reset=False,
        new_risk_score=5.0
    )

@router.post("/verify", response_model=TOTPVerifyResponse)
def verify_mfa_challenge(
    verify_in: TOTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify TOTP code during behavioral anomaly lockdown or step-up authentication.
    On valid code, resets the session risk score back to 5.0% and unlocks restricted actions.
    """
    if not current_user.totp_enabled or not current_user.totp_secret:
        # Fallback demo secret if user triggered high risk before manually configuring TOTP app
        # This prevents locking the academic user out during testing
        secret = current_user.totp_secret or generate_totp_secret()
        current_user.totp_secret = secret
        current_user.totp_enabled = True
        db.commit()

    # Check 6-digit TOTP
    is_valid = verify_totp_code(current_user.totp_secret, verify_in.code)

    # Check emergency backup codes fallback
    if not is_valid and current_user.backup_codes:
        stored_codes = [c.strip().upper() for c in current_user.backup_codes.split(",")]
        if verify_in.code.strip().upper() in stored_codes:
            is_valid = True
            stored_codes.remove(verify_in.code.strip().upper())
            current_user.backup_codes = ",".join(stored_codes)
            db.commit()

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code or backup code."
        )

    # Reset active session risk and clear challenge
    new_risk = 5.0
    if verify_in.session_token:
        user_session = db.query(UserSession).filter(
            UserSession.session_token == verify_in.session_token,
            UserSession.user_id == current_user.id
        ).first()
        if user_session:
            user_session.current_risk_score = new_risk
            user_session.risk_state = "LOW"
            user_session.is_mfa_challenged = False
            user_session.is_mfa_verified = True
            
            audit = AuditLog(
                user_id=current_user.id,
                session_id=user_session.id,
                event_type="MFA_RECOVERY_SUCCESS",
                risk_score=new_risk,
                details="Identity verified via TOTP. Session risk score reset to baseline."
            )
            db.add(audit)
            db.commit()

    return TOTPVerifyResponse(
        verified=True,
        message="MFA verification successful. Session identity restored.",
        risk_score_reset=True,
        new_risk_score=new_risk
    )
