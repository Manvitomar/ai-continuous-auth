from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import datetime

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.session import UserSession

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    return user

def get_or_create_session(
    user: User,
    session_token: Optional[str],
    db: Session,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> UserSession:
    """Retrieve an active session or create a new continuous session."""
    session_obj = None
    if session_token:
        session_obj = db.query(UserSession).filter(
            UserSession.session_token == session_token,
            UserSession.user_id == user.id,
            UserSession.is_active == True
        ).first()

    if not session_obj:
        new_token = f"sess_{uuid.uuid4().hex}"
        session_obj = UserSession(
            session_token=new_token,
            user_id=user.id,
            current_risk_score=5.0,  # Baseline low risk on clean auth
            risk_state="LOW",
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
            last_activity=datetime.datetime.utcnow()
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
    else:
        session_obj.last_activity = datetime.datetime.utcnow()
        db.commit()

    return session_obj
