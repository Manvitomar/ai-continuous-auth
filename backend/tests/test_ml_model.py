import numpy as np
import pytest
from app.schemas.biometric import BiometricFeatureVector
from app.ml.feature_extraction import calculate_baseline_summary
from app.ml.model import (
    train_user_isolation_forest,
    predict_biometric_risk,
    raw_score_to_risk_score
)
from app.ml.synthetic_benchmarks import evaluate_model_on_benchmark

@pytest.fixture
def mock_enrollment_data():
    samples = []
    for i in range(20):
        samples.append(BiometricFeatureVector(
            mean_hold_time=95.0 + np.random.normal(0, 4),
            std_hold_time=18.0 + np.random.normal(0, 2),
            mean_flight_time=140.0 + np.random.normal(0, 8),
            std_flight_time=30.0 + np.random.normal(0, 3),
            typing_speed_cpm=270.0 + np.random.normal(0, 10),
            pause_ratio=0.15,
            mean_velocity=0.85 + np.random.normal(0, 0.05),
            max_velocity=2.40 + np.random.normal(0, 0.1),
            mean_acceleration=0.045,
            mean_jerk=0.012,
            curvature_ratio=1.25,
            mean_click_duration=85.0,
            movement_to_click_ratio=14.0,
            scroll_intensity=120.0
        ))
    baseline = calculate_baseline_summary(samples)
    matrix = np.array([s.to_vector() for s in samples])
    return samples, baseline, matrix

def test_model_training_and_inference(mock_enrollment_data):
    samples, baseline, matrix = mock_enrollment_data
    user_id = 999

    # 1. Train model
    m_path, s_path, model, scaler = train_user_isolation_forest(
        user_id=user_id,
        samples_matrix=matrix,
        baseline_summary=baseline,
        version=1
    )
    assert model is not None
    assert scaler is not None

    # 2. Genuine sample inference (should produce low risk score)
    genuine_vector = np.array([
        95.0, 18.0, 140.0, 30.0, 270.0, 0.15,
        0.85, 2.40, 0.045, 0.012, 1.25, 85.0, 14.0, 120.0
    ])
    risk_score, raw_score, status, _, _ = predict_biometric_risk(
        user_id=user_id,
        feature_vector=genuine_vector,
        version=1,
        baseline_summary=baseline
    )
    assert raw_score > 0.0, "Genuine inlier should produce positive decision score"
    assert risk_score < 45.0, f"Genuine sample expected low risk, got {risk_score}"
    assert status == "LOW"

    # 3. Impostor / Anomaly sample inference (extreme velocity and zero flight variance)
    anomalous_vector = np.array([
        18.0, 0.2, 20.0, 0.1, 950.0, 0.01,
        9.50, 28.0, 1.45, 0.85, 1.001, 15.0, 1.0, 0.0
    ])
    risk_anom, raw_anom, status_anom, _, _ = predict_biometric_risk(
        user_id=user_id,
        feature_vector=anomalous_vector,
        version=1,
        baseline_summary=baseline
    )
    assert raw_anom < 0.0, "Anomaly should produce negative decision score"
    assert risk_anom > 70.0, f"Severe anomaly expected high risk, got {risk_anom}"
    assert status_anom == "HIGH"

def test_academic_benchmark_evaluation(mock_enrollment_data):
    samples, baseline, matrix = mock_enrollment_data
    user_id = 999
    
    train_user_isolation_forest(
        user_id=user_id,
        samples_matrix=matrix,
        baseline_summary=baseline,
        version=1
    )

    bench = evaluate_model_on_benchmark(user_id=user_id, baseline_summary=baseline, version=1)
    assert "metrics" in bench
    assert bench["metrics"]["roc_auc"] >= 0.80, "Academic benchmark ROC AUC should achieve strong separability"
    assert "confusion_matrix" in bench
    assert len(bench["roc_curve"]) >= 3
