import json
import datetime
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.session import UserSession, AuditLog
from app.models.biometric import BiometricProfile, TelemetryLog
from app.schemas.risk import TelemetryEvaluationRequest, TelemetryEvaluationResponse
from app.core.dependencies import get_current_user, get_or_create_session
from app.ml.feature_extraction import validate_and_sanitize_features
from app.ml.model import predict_biometric_risk
from app.ml.risk_engine import update_session_risk_score
from app.ml.explainability import explain_feature_deviations

router = APIRouter(prefix="/telemetry", tags=["Continuous Telemetry & Risk"])

@router.post("/evaluate", response_model=TelemetryEvaluationResponse)
def evaluate_telemetry(
    request_in: TelemetryEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Continuous authentication inference endpoint.
    Performs real Isolation Forest inference on incoming behavioral feature window,
    calculates smoothed session risk score, feature attributions, and triggers MFA challenge if anomalous.
    """
    if not current_user.is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric enrollment not completed. Please enroll first."
        )

    # 1. Load user profile and baseline
    profile = db.query(BiometricProfile).filter(BiometricProfile.user_id == current_user.id).first()
    if not profile or not profile.baseline_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User biometric baseline model not found."
        )

    baseline_summary = json.loads(profile.baseline_metrics)

    # 2. Extract and validate zero-content numerical feature array
    feature_arr = validate_and_sanitize_features(request_in.features)

    # 3. Real Isolation Forest inference
    inst_risk, raw_score, risk_status, _, _ = predict_biometric_risk(
        user_id=current_user.id,
        feature_vector=feature_arr,
        version=profile.model_version,
        baseline_summary=baseline_summary
    )

    # 4. Fetch or bind active session
    user_session = get_or_create_session(
        user=current_user,
        session_token=request_in.session_token,
        db=db
    )

    # 5. Continuous session smoothing (EMA)
    smoothed_risk, smoothed_state, is_mfa_required, is_locked = update_session_risk_score(
        previous_risk=user_session.current_risk_score,
        new_instantaneous_risk=inst_risk
    )

    # 6. Feature explainability attribution
    explanations = explain_feature_deviations(
        observed_vector=feature_arr,
        baseline_summary=baseline_summary,
        top_k=5
    )

    # 7. Update session state
    user_session.current_risk_score = smoothed_risk
    user_session.risk_state = smoothed_state
    if is_mfa_required and not user_session.is_mfa_verified:
        user_session.is_mfa_challenged = True

    # 8. Record telemetry log
    telemetry_log = TelemetryLog(
        user_id=current_user.id,
        session_id=user_session.id,
        risk_score=smoothed_risk,
        raw_anomaly_score=round(raw_score, 4),
        risk_status=smoothed_state,
        features_snapshot=json.dumps(request_in.features.dict()),
        explanations=json.dumps([e.dict() for e in explanations])
    )
    db.add(telemetry_log)

    # If critical threshold reached, write audit log
    if is_locked and not user_session.is_mfa_verified:
        audit = AuditLog(
            user_id=current_user.id,
            session_id=user_session.id,
            event_type="ANOMALY_DETECTED",
            risk_score=smoothed_risk,
            details=f"Behavioral anomaly threshold breached. Model raw score={raw_score:.3f}. MFA challenge issued."
        )
        db.add(audit)

    db.commit()

    return TelemetryEvaluationResponse(
        risk_score=smoothed_risk,
        raw_anomaly_score=round(raw_score, 4),
        risk_status=smoothed_state,
        is_mfa_required=is_mfa_required,
        is_session_locked=is_locked,
        explanations=explanations,
        session_token=user_session.session_token,
        timestamp=datetime.datetime.utcnow()
    )

@router.get("/history")
def get_telemetry_history(
    limit: int = 25,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve recent continuous authentication telemetry history."""
    logs = db.query(TelemetryLog).filter(
        TelemetryLog.user_id == current_user.id
    ).order_by(TelemetryLog.timestamp.desc()).limit(limit).all()

    items = []
    for l in reversed(logs):
        items.append({
            "id": l.id,
            "risk_score": l.risk_score,
            "raw_anomaly_score": l.raw_anomaly_score,
            "risk_status": l.risk_status,
            "timestamp": l.timestamp.isoformat(),
            "explanations": json.loads(l.explanations) if l.explanations else []
        })

    return items

@router.get("/session")
def get_session_status(
    session_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active session risk status."""
    user_session = db.query(UserSession).filter(
        UserSession.session_token == session_token,
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).first()

    if not user_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_token": user_session.session_token,
        "current_risk_score": user_session.current_risk_score,
        "risk_state": user_session.risk_state,
        "is_mfa_challenged": user_session.is_mfa_challenged,
        "is_mfa_verified": user_session.is_mfa_verified,
        "last_activity": user_session.last_activity
    }
