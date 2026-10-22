import pytest
from app.schemas.biometric import BiometricFeatureVector
from app.ml.feature_extraction import calculate_baseline_summary, validate_and_sanitize_features

def test_feature_vector_zero_content_guarantee():
    # Valid numerical sample
    valid_data = {
        "mean_hold_time": 95.4,
        "std_hold_time": 18.2,
        "mean_flight_time": 142.1,
        "std_flight_time": 32.5,
        "typing_speed_cpm": 280.0,
        "pause_ratio": 0.15,
        "mean_velocity": 0.85,
        "max_velocity": 2.40,
        "mean_acceleration": 0.045,
        "mean_jerk": 0.012,
        "curvature_ratio": 1.25,
        "mean_click_duration": 85.0,
        "movement_to_click_ratio": 14.5,
        "scroll_intensity": 120.0
    }
    vec = BiometricFeatureVector(**valid_data)
    arr = validate_and_sanitize_features(vec)
    assert len(arr) == 16
    assert arr[0] == 95.4

    # Enforce non-negative validation
    with pytest.raises(Exception):
        invalid_data = valid_data.copy()
        invalid_data["mean_hold_time"] = -10.0  # Cannot have negative hold time
        BiometricFeatureVector(**invalid_data)

    # Enforce curvature >= 1.0
    with pytest.raises(Exception):
        invalid_curv = valid_data.copy()
        invalid_curv["curvature_ratio"] = 0.5  # Curvature cannot be less than Euclidean 1.0
        BiometricFeatureVector(**invalid_curv)

def test_baseline_summary_calculation():
    samples = []
    for i in range(15):
        samples.append(BiometricFeatureVector(
            mean_hold_time=90.0 + i,
            std_hold_time=15.0,
            mean_flight_time=130.0 + (i * 2),
            std_flight_time=25.0,
            typing_speed_cpm=250.0 + (i * 5),
            pause_ratio=0.12,
            mean_velocity=0.80,
            max_velocity=2.1,
            mean_acceleration=0.04,
            mean_jerk=0.01,
            curvature_ratio=1.20,
            mean_click_duration=80.0,
            movement_to_click_ratio=12.0,
            scroll_intensity=100.0
        ))

    summary = calculate_baseline_summary(samples)
    assert "mean_hold_time" in summary
    assert summary["mean_hold_time"]["mean"] == pytest.approx(97.0, 0.1)
    assert summary["mean_hold_time"]["min"] == 90.0
    assert summary["mean_hold_time"]["max"] == 104.0
