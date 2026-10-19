import json
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.biometric import BiometricProfile
from app.models.session import AuditLog
from app.schemas.biometric import EnrollmentSubmission, EnrollmentResponse
from app.core.dependencies import get_current_user
from app.ml.feature_extraction import calculate_baseline_summary
from app.ml.model import train_user_isolation_forest
from app.ml.synthetic_benchmarks import evaluate_model_on_benchmark

router = APIRouter(prefix="/biometric", tags=["Biometric Profile & Model"])

@router.post("/enroll", response_model=EnrollmentResponse)
def enroll_biometrics(
    submission: EnrollmentSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enroll genuine behavioral biometric feature samples and train the user's Isolation Forest model.
    Zero-content guarantee: Enforces that samples only contain statistical dynamics.
    """
    if not current_user.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric telemetry consent has not been granted. Please accept consent first."
        )

    if len(submission.samples) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 10 behavioral feature windows are required for model training."
        )

    # 1. Compute statistical baseline summary
    baseline = calculate_baseline_summary(submission.samples)
    samples_matrix = np.array([s.to_vector() for s in submission.samples], dtype=np.float64)

    # 2. Train user personalized Isolation Forest
    version = 1
    existing_profile = db.query(BiometricProfile).filter(BiometricProfile.user_id == current_user.id).first()
    if existing_profile:
        version = existing_profile.model_version + 1

    model_path, scaler_path, model, scaler = train_user_isolation_forest(
        user_id=current_user.id,
        samples_matrix=samples_matrix,
        baseline_summary=baseline,
        version=version,
        contamination=0.05
    )

    # 3. Run academic benchmark evaluation
    bench_results = evaluate_model_on_benchmark(
        user_id=current_user.id,
        baseline_summary=baseline,
        version=version
    )

    # 4. Save to Database
    if existing_profile:
        existing_profile.model_version = version
        existing_profile.model_path = model_path
        existing_profile.scaler_path = scaler_path
        existing_profile.samples_count = len(submission.samples)
        existing_profile.baseline_metrics = json.dumps(baseline)
        existing_profile.evaluation_metrics = json.dumps(bench_results)
    else:
        new_profile = BiometricProfile(
            user_id=current_user.id,
            model_version=version,
            model_path=model_path,
            scaler_path=scaler_path,
            samples_count=len(submission.samples),
            baseline_metrics=json.dumps(baseline),
            evaluation_metrics=json.dumps(bench_results)
        )
        db.add(new_profile)

    current_user.is_enrolled = True
    
    audit = AuditLog(
        user_id=current_user.id,
        event_type="ENROLLMENT_COMPLETED",
        details=f"Trained Isolation Forest v{version} on {len(submission.samples)} biometric windows."
    )
    db.add(audit)
    db.commit()

    return EnrollmentResponse(
        status="SUCCESS",
        message="Biometric anomaly-detection model successfully trained and calibrated.",
        samples_enrolled=len(submission.samples),
        model_version=version,
        baseline_summary=baseline
    )

@router.get("/profile")
def get_biometric_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user's biometric model metadata and baseline profile."""
    profile = db.query(BiometricProfile).filter(BiometricProfile.user_id == current_user.id).first()
    if not profile:
        return {
            "is_enrolled": False,
            "samples_count": 0,
            "model_version": 0,
            "baseline": None
        }

    return {
        "is_enrolled": True,
        "samples_count": profile.samples_count,
        "model_version": profile.model_version,
        "baseline": json.loads(profile.baseline_metrics) if profile.baseline_metrics else None,
        "created_at": profile.created_at
    }

@router.get("/evaluation")
def get_model_evaluation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve academic model evaluation metrics, ROC curve, and confusion matrix."""
    profile = db.query(BiometricProfile).filter(BiometricProfile.user_id == current_user.id).first()
    if not profile or not profile.evaluation_metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model has not been trained yet. Please complete enrollment first."
        )

    return json.loads(profile.evaluation_metrics)
