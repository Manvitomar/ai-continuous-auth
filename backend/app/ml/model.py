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
    
    Decision Function Output Profile:
    - Highly typical normal behavior: +0.15 to +0.35 -> Risk: 5% to 25%
    - Normal borderline: +0.02 to +0.08 -> Risk: 35% to 55%
    - Noticeable anomaly: -0.01 to -0.08 -> Risk: 65% to 85%
    - Severe deviation/attack: < -0.15 -> Risk: 90% to 99%
    """
    s = float(raw_decision_score)
    # Calibrated sigmoid parameters
    boundary_offset = 0.035
    steepness = 16.0
    
    exponent = -steepness * (s - boundary_offset)
    # Clamp exponent to avoid float overflow
    exponent = max(-30.0, min(30.0, exponent))
    
    prob_anomaly = 1.0 / (1.0 + math.exp(-exponent))
    risk_score = round(float(prob_anomaly * 100.0), 2)
    return min(100.0, max(0.0, risk_score))

def predict_biometric_risk(
    user_id: int,
    feature_vector: np.ndarray,
    version: int = 1,
    baseline_summary: Optional[Dict[str, Any]] = None
) -> Tuple[float, float, str, IsolationForest, RobustScaler]:
    """
    Execute real model inference and return:
    (risk_score, raw_anomaly_score, risk_status, model, scaler)
    """
    model, scaler, _ = load_user_model(user_id, version, baseline_summary)
    
    # 2D reshape for single sample inference
    sample_2d = feature_vector.reshape(1, -1)
    scaled_sample = scaler.transform(sample_2d)

    # Real Isolation Forest inference
    raw_decision = float(model.decision_function(scaled_sample)[0])
    risk_score = raw_score_to_risk_score(raw_decision)

    if risk_score <= 40.0:
        status = "LOW"
    elif risk_score <= 70.0:
        status = "MEDIUM"
    else:
        status = "HIGH"

    return risk_score, raw_decision, status, model, scaler
