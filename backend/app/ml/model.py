import os
import math
import joblib
import numpy as np
from typing import Tuple, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

# Model storage path
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "models")
os.makedirs(STORAGE_DIR, exist_ok=True)

# In-memory model cache: {user_id: (model, scaler, baseline_summary)}
_MODEL_CACHE: Dict[int, Tuple[IsolationForest, RobustScaler, Dict[str, Any]]] = {}

def get_model_file_paths(user_id: int, version: int = 1) -> Tuple[str, str]:
    model_path = os.path.join(STORAGE_DIR, f"user_{user_id}_model_v{version}.joblib")
    scaler_path = os.path.join(STORAGE_DIR, f"user_{user_id}_scaler_v{version}.joblib")
    return model_path, scaler_path

def train_user_isolation_forest(
    user_id: int,
    samples_matrix: np.ndarray,
    baseline_summary: Dict[str, Any],
    version: int = 1,
    contamination: float = 0.05,
    n_estimators: int = 100,
    random_state: int = 42
) -> Tuple[str, str, IsolationForest, RobustScaler]:
    """
    Train a personalized Isolation Forest model on genuine enrollment vectors.
    Uses RobustScaler to be resilient to natural human variance.
    """
    scaler = RobustScaler()
    scaled_samples = scaler.fit_transform(samples_matrix)

    # Contamination is set low (e.g. 5%) since enrollment sessions are presumed genuine
    model = IsolationForest(
        n_estimators=n_estimators,
        max_samples="auto",
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1
    )
    model.fit(scaled_samples)

    # Persist model and scaler
    model_path, scaler_path = get_model_file_paths(user_id, version)
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    # Update cache
    _MODEL_CACHE[user_id] = (model, scaler, baseline_summary)

    return model_path, scaler_path, model, scaler

def load_user_model(
    user_id: int,
    version: int = 1,
    baseline_summary: Optional[Dict[str, Any]] = None
) -> Tuple[IsolationForest, RobustScaler, Optional[Dict[str, Any]]]:
    """Load model from in-memory cache or disk."""
    if user_id in _MODEL_CACHE:
        return _MODEL_CACHE[user_id]

    model_path, scaler_path = get_model_file_paths(user_id, version)
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Trained biometric model not found for user_id={user_id}")

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    _MODEL_CACHE[user_id] = (model, scaler, baseline_summary or {})
    return model, scaler, baseline_summary

def raw_score_to_risk_score(raw_decision_score: float) -> float:
    """
    Convert raw Isolation Forest decision_function output to a calibrated 0-100 Risk Score.
    """
    s = float(raw_decision_score)
    # Calibrated sigmoid parameters
    boundary_offset = 0.04
    steepness = 18.0
    
    exponent = -steepness * (s - boundary_offset)
    exponent = max(-30.0, min(30.0, exponent))
    
    prob_anomaly = 1.0 / (1.0 + math.exp(-exponent))
    risk_score = round(float(prob_anomaly * 100.0), 2)
    return min(100.0, max(0.0, risk_score))

def compute_statistical_z_risk(
    feature_vector: np.ndarray,
    baseline_summary: Optional[Dict[str, Any]]
) -> float:
    """
    Compute multi-feature standardized statistical divergence (Mahalanobis-inspired Z-distance).
    Directly detects behavioral changes (e.g., someone else using the keyboard/trackpad)
    even when individual tree partitions are broad.
    """
    if not baseline_summary:
        return 10.0

    from app.ml.feature_extraction import FEATURE_NAMES
    z_scores = []
    for i, name in enumerate(FEATURE_NAMES):
        if i >= len(feature_vector) or name not in baseline_summary:
            continue
        stats = baseline_summary[name]
        mean = stats.get("mean", 0.0)
        std = stats.get("std", 1.0)
        # Safe std avoids division by zero for features with very low training variance
        safe_std = max(std, 0.08 * max(abs(mean), 1.0))
        val = float(feature_vector[i])
        z = abs(val - mean) / safe_std
        z_scores.append(z)

    if not z_scores:
        return 10.0

    z_arr = np.array(z_scores)
    # Focus on top 3 most anomalous feature divergences
    top_z = np.sort(z_arr)[::-1][:3]
    avg_top_z = float(np.mean(top_z))

    # Sigmoid calibration:
    # avg_top_z <= 1.2 -> Genuine normal human variance (~10% - 20%)
    # avg_top_z = 2.0 -> Noticeable deviation (~55%)
    # avg_top_z >= 2.8 -> Distinct other person / strong anomaly (~85% - 98%)
    k = 2.4
    z_center = 1.90
    exponent = -k * (avg_top_z - z_center)
    exponent = max(-30.0, min(30.0, exponent))
    dist_risk = 100.0 / (1.0 + math.exp(exponent))
    return float(round(dist_risk, 2))

def predict_biometric_risk(
    user_id: int,
    feature_vector: np.ndarray,
    version: int = 1,
    baseline_summary: Optional[Dict[str, Any]] = None
) -> Tuple[float, float, str, IsolationForest, RobustScaler]:
    """
    Execute hybrid ensemble inference (Isolation Forest + Statistical Z-Distance) and return:
    (risk_score, raw_anomaly_score, risk_status, model, scaler)
    """
    model, scaler, _ = load_user_model(user_id, version, baseline_summary)
    
    # Ensure feature dimensions match model training dimensions for bidirectional backward compatibility
    n_expected = scaler.n_features_in_
    if feature_vector.shape[0] > n_expected:
        sample_for_model = feature_vector[:n_expected].reshape(1, -1)
    elif feature_vector.shape[0] < n_expected:
        defaults = np.array([0.35, 0.22], dtype=np.float64)
        padding = defaults[:(n_expected - feature_vector.shape[0])]
        sample_for_model = np.concatenate([feature_vector, padding]).reshape(1, -1)
    else:
        sample_for_model = feature_vector.reshape(1, -1)

    scaled_sample = scaler.transform(sample_for_model)

    # 1. Real Isolation Forest inference
    raw_decision = float(model.decision_function(scaled_sample)[0])
    iso_risk = raw_score_to_risk_score(raw_decision)

    # 2. Parametric Statistical Z-Distance inference
    dist_risk = compute_statistical_z_risk(feature_vector, baseline_summary)

    # 3. Hybrid Ensemble:
    # If either the tree partition depth OR the statistical distribution detects an impostor,
    # the risk score reflects the high-confidence threat signal
    risk_score = round(max(iso_risk, dist_risk * 0.95), 2)

    if risk_score <= 40.0:
        status = "LOW"
    elif risk_score <= 70.0:
        status = "MEDIUM"
    else:
        status = "HIGH"

    return risk_score, raw_decision, status, model, scaler
