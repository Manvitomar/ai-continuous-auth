import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.session import UserSession, AuditLog
from app.schemas.risk import SensitiveActionRequest, SensitiveActionResponse
from app.core.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/actions", tags=["Sensitive Gated Actions & Audit"])

@router.post("/execute", response_model=SensitiveActionResponse)
def execute_sensitive_action(
    action_in: SensitiveActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a sensitive action (e.g. Wire Transfer, Academic Data Export).
    Gated by real-time behavioral risk score:
    - Risk <= 40: Allowed
    - 40 < Risk <= 70: Elevated monitoring warning
    - Risk > 70: Blocked unless verified via step-up TOTP MFA
    """
    user_session = None
    if action_in.session_token:
        user_session = db.query(UserSession).filter(
            UserSession.session_token == action_in.session_token,
            UserSession.user_id == current_user.id
        ).first()

    current_risk = user_session.current_risk_score if user_session else 10.0
    is_mfa_verified = user_session.is_mfa_verified if user_session else False
    active_threshold = action_in.threshold if action_in.threshold is not None else settings.RISK_HIGH_THRESHOLD

    # Security policy enforcement
    if current_risk > active_threshold and not is_mfa_verified:
        # Action strictly blocked
        audit = AuditLog(
            user_id=current_user.id,
            session_id=user_session.id if user_session else None,
            event_type="SENSITIVE_ACTION_BLOCKED",
            risk_score=current_risk,
            details=f"Blocked attempt to execute '{action_in.action_type}'. Risk score ({current_risk:.1f}%) exceeds safety threshold."
        )
        db.add(audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "RISK_THRESHOLD_EXCEEDED",
                "message": f"Action blocked: Real-time biometric anomaly risk is {current_risk:.1f}%. Step-up TOTP MFA verification required to execute this operation.",
                "risk_score": current_risk,
                "requires_mfa": True
            }
        )

    # Action permitted
    tx_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    audit = AuditLog(
        user_id=current_user.id,
        session_id=user_session.id if user_session else None,
        event_type="SENSITIVE_ACTION_SUCCESS",
        risk_score=current_risk,
        details=f"Executed '{action_in.action_type}' for {action_in.target or 'N/A'}. TXN: {tx_id}. Risk={current_risk:.1f}%."
    )
    db.add(audit)
    db.commit()

    return SensitiveActionResponse(
        success=True,
        status="EXECUTED",
        message=f"Action '{action_in.action_type}' executed securely.",
        risk_score_at_execution=current_risk,
        requires_step_up_mfa=False,
        transaction_id=tx_id
    )

@router.get("/audit")
def get_audit_trail(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve security audit logs for the user."""
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "event_type": l.event_type,
            "risk_score": l.risk_score,
            "details": l.details,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]
