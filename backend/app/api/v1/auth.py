import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.session import UserSession, AuditLog
from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse, ConsentUpdate
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with secure password hashing."""
    existing_user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    hashed_pw = hash_password(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pw,
        is_active=True,
        is_enrolled=False,
        consent_given=False,
        totp_enabled=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=user.id,
        event_type="AUTH_REGISTER",
        details="User account registered successfully."
    )
    db.add(audit)
    db.commit()

    return user

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate credentials and initialize a continuous biometric session."""
    user = db.query(User).filter(User.username == login_in.username).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is disabled"
        )

    access_token = create_access_token(data={"sub": str(user.id), "username": user.username})
    
    # Initialize active continuous session
    session_token = f"sess_{uuid.uuid4().hex}"
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")[:250]
    
    user_session = UserSession(
        session_token=session_token,
        user_id=user.id,
        current_risk_score=5.0,  # Baseline clean low risk
        risk_state="LOW",
        ip_address=client_ip,
        user_agent=user_agent,
        is_active=True
    )
    db.add(user_session)
    
    audit = AuditLog(
        user_id=user.id,
        session_id=user_session.id,
        event_type="AUTH_LOGIN",
        risk_score=5.0,
        details=f"User logged in from {client_ip}."
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        session_token=session_token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of currently logged-in user."""
    return current_user

@router.post("/consent", response_model=UserResponse)
def update_consent(
    consent_in: ConsentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grant or revoke consent for behavioral biometric telemetry collection."""
    current_user.consent_given = consent_in.consent_given
    current_user.consent_timestamp = datetime.datetime.utcnow() if consent_in.consent_given else None
    
    db.commit()
    db.refresh(current_user)

    audit = AuditLog(
        user_id=current_user.id,
        event_type="CONSENT_UPDATED",
        details=f"Biometric consent set to {consent_in.consent_given}."
    )
    db.add(audit)
    db.commit()

    return current_user

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate active sessions for user."""
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False})

    audit = AuditLog(
        user_id=current_user.id,
        event_type="AUTH_LOGOUT",
        details="User logged out."
    )
    db.add(audit)
    db.commit()

    return {"message": "Logged out successfully"}
