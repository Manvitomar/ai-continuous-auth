import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.biometric import BiometricFeatureVector

FEATURE_NAMES = BiometricFeatureVector.feature_names()

FEATURE_METADATA = {
    "mean_hold_time": {
        "label": "Average Key Hold Duration",
        "unit": "ms",
        "desc": "How long keys remain pressed down before release."
    },
    "std_hold_time": {
        "label": "Key Hold Consistency",
        "unit": "ms",
        "desc": "Variability in how consistently keys are depressed."
    },
    "mean_flight_time": {
        "label": "Key Flight Latency",
        "unit": "ms",
        "desc": "Time elapsed between releasing a key and pressing the next."
    },
    "std_flight_time": {
        "label": "Key Flight Variance",
        "unit": "ms",
        "desc": "Rhythmic uniformity of inter-key transitions."
    },
    "typing_speed_cpm": {
        "label": "Typing Cadence",
        "unit": "cpm",
        "desc": "Interaction keystroke frequency per minute."
    },
    "pause_ratio": {
        "label": "Cognitive Pause Ratio",
        "unit": "ratio",
        "desc": "Fraction of window time spent in reflective pauses (>400ms)."
    },
    "mean_velocity": {
        "label": "Cursor Velocity",
        "unit": "px/ms",
        "desc": "Average speed of cursor motion across coordinates."
    },
    "max_velocity": {
        "label": "Peak Cursor Velocity",
        "unit": "px/ms",
        "desc": "Highest speed burst achieved in cursor trajectory."
    },
    "mean_acceleration": {
        "label": "Cursor Acceleration",
        "unit": "px/ms²",
        "desc": "Rate of change in cursor velocity."
    },
    "mean_jerk": {
        "label": "Kinematic Jerk (Tremor)",
        "unit": "px/ms³",
        "desc": "Smoothness of motion; high jerk indicates erratic or jittery path."
    },
    "curvature_ratio": {
        "label": "Trajectory Curvature",
        "unit": "ratio",
        "desc": "Arc length divided by direct Euclidean distance. Straight=1.0."
    },
    "mean_click_duration": {
        "label": "Click Depression Duration",
        "unit": "ms",
        "desc": "Time between mousedown and mouseup."
    },
    "movement_to_click_ratio": {
        "label": "Move-to-Click Ratio",
        "unit": "events",
        "desc": "Proportion of navigation strokes preceding actions."
    },
    "scroll_intensity": {
        "label": "Scroll Dynamics",
        "unit": "px/s",
        "desc": "Intensity and frequency of scrolling displacement."
    },
    "keystroke_overlap_ratio": {
        "label": "Key Overlap (Roll Typing)",
        "unit": "ratio",
        "desc": "Degree to which consecutive keys overlap in down-state. Discriminates touch-typists from hunt-and-peck."
    },
    "flight_time_cv": {
        "label": "Cadence Uniformity (CV)",
        "unit": "ratio",
        "desc": "Coefficient of variation in key transitions. Detects hesitations and foreign typing patterns."
    }
}

def validate_and_sanitize_features(features: BiometricFeatureVector) -> np.ndarray:
    """
    Validate that feature vector consists strictly of valid finite numerical values.
    Zero-content guarantee: Enforces that no text, strings, or PII can be parsed.
    """
    vec = features.to_vector()
    arr = np.array(vec, dtype=np.float64)
    if np.any(np.isnan(arr)) or np.any(np.isinf(arr)):
        # Replace non-finite entries with safe lower bounds
        arr = np.nan_to_num(arr, nan=0.0, posinf=1000.0, neginf=0.0)
    return arr

def calculate_baseline_summary(samples: List[BiometricFeatureVector]) -> Dict[str, Dict[str, float]]:
    """
    Compute statistical distribution properties of enrollment samples.
    Used for baseline storage and explainability Z-scores.
    """
    matrix = np.array([s.to_vector() for s in samples], dtype=np.float64)
    summary = {}
    for i, name in enumerate(FEATURE_NAMES):
        col = matrix[:, i]
        mean_val = float(np.mean(col))
        std_val = float(np.std(col))
        summary[name] = {
            "mean": round(mean_val, 4),
            "std": round(std_val if std_val > 1e-4 else 1.0, 4),
            "median": round(float(np.median(col)), 4),
            "min": round(float(np.min(col)), 4),
            "max": round(float(np.max(col)), 4),
        }
    return summary
