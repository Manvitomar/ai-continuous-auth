from typing import List, Dict, Any
import numpy as np
from app.schemas.risk import FeatureAnomalyExplanation
from app.ml.feature_extraction import FEATURE_NAMES, FEATURE_METADATA

def explain_feature_deviations(
    observed_vector: np.ndarray,
    baseline_summary: Dict[str, Dict[str, float]],
    top_k: int = 5
) -> List[FeatureAnomalyExplanation]:
    """
    Generate feature-level anomaly attributions by calculating normalized Z-score
    deviations from the user's enrolled baseline profile.
    """
    explanations: List[FeatureAnomalyExplanation] = []

    for i, name in enumerate(FEATURE_NAMES):
        obs_val = float(observed_vector[i])
        stats = baseline_summary.get(name, {})
        base_mean = stats.get("mean", obs_val)
        base_std = stats.get("std", 1.0)
        if base_std <= 1e-4:
            base_std = 1.0

        z_score = (obs_val - base_mean) / base_std
        abs_z = abs(z_score)

        direction = "HIGHER" if z_score > 0 else "LOWER"

        if abs_z >= 2.5:
            severity = "CRITICAL"
        elif abs_z >= 1.5:
            severity = "WARNING"
        else:
            severity = "NORMAL"

        meta = FEATURE_METADATA.get(name, {"label": name, "unit": "", "desc": ""})
        label = meta["label"]
        unit = meta["unit"]

        # Human friendly description
        pct_change = ((obs_val - base_mean) / (abs(base_mean) + 1e-5)) * 100.0
        if severity == "NORMAL":
            desc = f"{label} is within normal behavioral tolerance ({obs_val:.1f} {unit} vs enrolled {base_mean:.1f} {unit})."
        else:
            dir_text = "elevated by" if pct_change > 0 else "reduced by"
            desc = f"{label} is {dir_text} {abs(pct_change):.1f}% ({abs_z:.1f} standard deviations from baseline)."

        explanations.append(FeatureAnomalyExplanation(
            feature_name=name,
            feature_label=label,
            observed_value=round(obs_val, 2),
            baseline_mean=round(base_mean, 2),
            deviation_z_score=round(float(z_score), 2),
            direction=direction,
            severity=severity,
            description=desc
        ))

    # Sort primarily by absolute z-score descending (largest anomalies first)
    explanations.sort(key=lambda x: abs(x.deviation_z_score), reverse=True)
    return explanations[:top_k]
