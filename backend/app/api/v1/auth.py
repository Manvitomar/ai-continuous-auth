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

def ensure_demo_user(db: Session) -> User:
    """Ensure a pre-calibrated academic demo researcher profile exists with real trained model."""
    demo_user = db.query(User).filter(User.username == "demo_researcher").first()
    if not demo_user:
        hashed_pw = hash_password("DemoPassword2026!")
        demo_user = User(
            username="demo_researcher",
            email="demo.researcher@academic.edu",
            hashed_password=hashed_pw,
            is_active=True,
            is_enrolled=True,
            consent_given=True,
            consent_timestamp=datetime.datetime.utcnow(),
            totp_secret="JBSWY3DPEHPK3PXP",
            totp_enabled=True,
            backup_codes="DEMO-1048,DEMO-2938,DEMO-5821,DEMO-7392,DEMO-9104"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        
        try:
            import json
            import numpy as np
            from app.ml.feature_extraction import FEATURE_NAMES
            from app.ml.model import train_user_isolation_forest
            from app.ml.synthetic_benchmarks import evaluate_model_on_benchmark
            from app.models.biometric import BiometricProfile

            baseline = {
                "mean_hold_time": {"mean": 88.0, "std": 12.0, "median": 86.0, "iqr": 15.0},
                "std_hold_time": {"mean": 18.0, "std": 4.0, "median": 17.5, "iqr": 5.0},
                "mean_flight_time": {"mean": 145.0, "std": 25.0, "median": 142.0, "iqr": 30.0},
                "std_flight_time": {"mean": 42.0, "std": 8.0, "median": 41.0, "iqr": 10.0},
                "backspace_ratio": {"mean": 0.04, "std": 0.02, "median": 0.035, "iqr": 0.02},
                "typing_speed_cpm": {"mean": 340.0, "std": 35.0, "median": 338.0, "iqr": 45.0},
                "mean_velocity": {"mean": 0.85, "std": 0.18, "median": 0.82, "iqr": 0.22},
                "std_velocity": {"mean": 0.42, "std": 0.09, "median": 0.40, "iqr": 0.11},
                "mean_acceleration": {"mean": 0.015, "std": 0.004, "median": 0.014, "iqr": 0.005},
                "mean_jerk": {"mean": 0.0012, "std": 0.0003, "median": 0.0011, "iqr": 0.0004},
                "curvature_ratio": {"mean": 1.28, "std": 0.15, "median": 1.26, "iqr": 0.18},
                "straightness_ratio": {"mean": 0.82, "std": 0.08, "median": 0.83, "iqr": 0.09},
                "click_frequency": {"mean": 0.45, "std": 0.12, "median": 0.44, "iqr": 0.14},
                "mean_click_duration": {"mean": 105.0, "std": 18.0, "median": 102.0, "iqr": 22.0},
                "pause_ratio": {"mean": 0.14, "std": 0.04, "median": 0.13, "iqr": 0.05},
            }

            rng = np.random.RandomState(42)
            means = np.array([baseline[name]["mean"] for name in FEATURE_NAMES])
            stds = np.array([baseline[name]["std"] for name in FEATURE_NAMES])
            samples = [np.maximum(0.01, means + rng.normal(0, 0.25, size=len(means)) * stds) for _ in range(30)]
            samples_matrix = np.array(samples, dtype=np.float64)

            model_path, scaler_path, _, _ = train_user_isolation_forest(
                user_id=demo_user.id,
                samples_matrix=samples_matrix,
                baseline_summary=baseline,
                version=1,
                contamination=0.05
            )

            bench_results = evaluate_model_on_benchmark(
                user_id=demo_user.id,
                baseline_summary=baseline,
                version=1
            )

            profile = BiometricProfile(
                user_id=demo_user.id,
                model_version=1,
                model_path=model_path,
                scaler_path=scaler_path,
                samples_count=30,
                baseline_metrics=json.dumps(baseline),
                evaluation_metrics=json.dumps(bench_results)
            )
            db.add(profile)
            db.commit()
        except Exception as e:
            # If model directory write fails in read-only environment, keep user active
            print("Demo profile initialization warning:", e)

    return demo_user

@router.post("/demo", response_model=TokenResponse)
def login_demo_evaluator(request: Request, db: Session = Depends(get_db)):
    """One-click instant login for academic evaluators with pre-calibrated baseline and model."""
    user = ensure_demo_user(db)
    access_token = create_access_token(data={"sub": str(user.id), "username": user.username})

    session_token = f"sess_{uuid.uuid4().hex}"
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Evaluator Browser")[:250]

    user_session = UserSession(
        session_token=session_token,
        user_id=user.id,
        current_risk_score=5.0,
        risk_state="LOW",
        ip_address=client_ip,
        user_agent=user_agent,
        is_active=True
    )
    db.add(user_session)

    audit = AuditLog(
        user_id=user.id,
        session_id=user_session.id,
        event_type="AUTH_DEMO_LOGIN",
        risk_score=5.0,
        details="Evaluator logged in via One-Click Demo Mode."
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
