import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.metrics import roc_curve, auc, precision_recall_fscore_support, confusion_matrix
from app.ml.feature_extraction import FEATURE_NAMES
from app.ml.model import predict_biometric_risk, raw_score_to_risk_score

def generate_academic_benchmark_dataset(
    baseline_summary: Dict[str, Dict[str, float]],
    n_genuine: int = 50,
    n_impostor: int = 50,
    random_seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Generate academically labeled evaluation dataset grounded in user's baseline:
    - Genuine samples: Ground truth = 0 (Normal)
    - Impostor samples: Ground truth = 1 (Anomaly)
    """
    rng = np.random.RandomState(random_seed)
    
    means = np.array([baseline_summary[name]["mean"] for name in FEATURE_NAMES])
    stds = np.array([baseline_summary[name]["std"] for name in FEATURE_NAMES])
    
    # Ensure reasonable variation floor for features with low training variance
    stds = np.where(stds < 1e-2, 0.05 * np.maximum(means, 1.0), stds)

    # 1. Genuine samples (Ground truth = 0, Normal)
    genuine_samples = []
    for _ in range(n_genuine):
        noise = rng.normal(loc=0.0, scale=0.3, size=len(means))
        sample = np.maximum(0.01, means + (noise * stds))
        curv_idx = FEATURE_NAMES.index("curvature_ratio")
        sample[curv_idx] = max(1.0, sample[curv_idx])
        pause_idx = FEATURE_NAMES.index("pause_ratio")
        sample[pause_idx] = min(0.95, max(0.01, sample[pause_idx]))
        genuine_samples.append(sample)

    # 2. Impostor samples (Ground truth = 1, Anomaly)
    impostor_samples = []
    impostor_labels = []

    # A. Simulated Bot / Scripted Injection (unnatural uniformity & straight lines)
    for _ in range(n_impostor // 3):
        sample = means.copy()
        sample[FEATURE_NAMES.index("mean_hold_time")] = 18.0   # Bot: ultra short keypress
        sample[FEATURE_NAMES.index("std_hold_time")] = 0.5     # Bot: near zero variance
        sample[FEATURE_NAMES.index("mean_flight_time")] = 22.0 # Bot: rapid fire
        sample[FEATURE_NAMES.index("std_flight_time")] = 0.8   # Bot: mechanical uniformity
        sample[FEATURE_NAMES.index("typing_speed_cpm")] = 920.0 # Bot: 920 CPM
        sample[FEATURE_NAMES.index("curvature_ratio")] = 1.001  # Bot: perfectly straight mouse vector
        sample[FEATURE_NAMES.index("mean_jerk")] = 0.05
        impostor_samples.append(sample)
        impostor_labels.append("SYNTHETIC_BOT_INJECTION")

    # B. Simulated Hunt-and-Peck Impostor (foreign typist with sluggish latency)
    for _ in range(n_impostor // 3):
        sample = means.copy()
        sample[FEATURE_NAMES.index("mean_hold_time")] = means[FEATURE_NAMES.index("mean_hold_time")] * 2.8
        sample[FEATURE_NAMES.index("mean_flight_time")] = means[FEATURE_NAMES.index("mean_flight_time")] * 3.5
        sample[FEATURE_NAMES.index("typing_speed_cpm")] = max(50.0, means[FEATURE_NAMES.index("typing_speed_cpm")] * 0.3)
        sample[FEATURE_NAMES.index("mean_velocity")] = max(0.1, means[FEATURE_NAMES.index("mean_velocity")] * 0.35)
        sample[FEATURE_NAMES.index("curvature_ratio")] = means[FEATURE_NAMES.index("curvature_ratio")] * 2.2
        sample[FEATURE_NAMES.index("pause_ratio")] = min(0.9, means[FEATURE_NAMES.index("pause_ratio")] * 2.5 + 0.2)
        impostor_samples.append(sample)
        impostor_labels.append("SYNTHETIC_HUNT_AND_PECK_USER")

    # C. Simulated Erratic / Jittery Impostor (mouse tremor and jerky keystrokes)
    remaining = n_impostor - len(impostor_samples)
    for _ in range(remaining):
        sample = means.copy()
        sample[FEATURE_NAMES.index("mean_jerk")] = means[FEATURE_NAMES.index("mean_jerk")] * 5.0 + 15.0
        sample[FEATURE_NAMES.index("max_velocity")] = means[FEATURE_NAMES.index("max_velocity")] * 3.2
        sample[FEATURE_NAMES.index("curvature_ratio")] = 3.8
        sample[FEATURE_NAMES.index("std_flight_time")] = means[FEATURE_NAMES.index("std_flight_time")] * 4.0
        impostor_samples.append(sample)
        impostor_labels.append("SYNTHETIC_ERRATIC_JITTER_IMPOSTOR")

    X = np.vstack([np.array(genuine_samples), np.array(impostor_samples)])
    # In cybersecurity anomaly detection: 0 = Genuine, 1 = Anomaly/Impostor
    y = np.array([0] * n_genuine + [1] * n_impostor, dtype=np.int32)
    sample_tags = ["GENUINE_TEST_SAMPLE"] * n_genuine + impostor_labels

    return X, y, sample_tags

def evaluate_model_on_benchmark(
    user_id: int,
    baseline_summary: Dict[str, Dict[str, float]],
    version: int = 1
) -> Dict[str, Any]:
    """
    Run empirical academic benchmark evaluation on the user's trained Isolation Forest.
    Outputs ROC curve, AUC score, Confusion Matrix, and Precision/Recall/F1 metrics.
    """
    X, y_true, sample_tags = generate_academic_benchmark_dataset(baseline_summary, n_genuine=50, n_impostor=50)
    
    risk_scores = []
    raw_scores = []
    
    for i in range(len(X)):
        risk, raw, status, _, _ = predict_biometric_risk(
            user_id=user_id,
            feature_vector=X[i],
            version=version,
            baseline_summary=baseline_summary
        )
        risk_scores.append(risk)
        raw_scores.append(raw)
        
    risk_scores = np.array(risk_scores)
    raw_scores = np.array(raw_scores)

    # In cybersecurity:
    # y_true is 1 for Anomaly (Impostor), 0 for Genuine
    # Prediction score is risk_scores (0 to 100), where higher score = more likely anomaly
    fpr, tpr, thresholds = roc_curve(y_true, risk_scores)
    roc_auc = float(auc(fpr, tpr))

    # Evaluate binary classification at threshold Risk > 50 -> Anomaly (1)
    y_pred = (risk_scores > 50.0).astype(int)
    
    cm = confusion_matrix(y_true, y_pred)
    # cm: [[TN, FP], [FN, TP]]
    tn, fp, fn, tp = cm.ravel()
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)

    # Genuine vs Impostor risk score distributions
    genuine_risks = [round(float(r), 1) for r in risk_scores[y_true == 0]]
    impostor_risks = [round(float(r), 1) for r in risk_scores[y_true == 1]]

    # Simplified ROC curve points for frontend charts (subsample to 15 points)
    idx_sub = np.linspace(0, len(fpr) - 1, min(15, len(fpr)), dtype=int)
    roc_points = [
        {"fpr": round(float(fpr[i]), 3), "tpr": round(float(tpr[i]), 3)}
        for i in idx_sub
    ]

    return {
        "dataset_label": "ACADEMIC_SYNTHETIC_BENCHMARK_GROUNDED_IN_USER_PROFILE",
        "sample_count": len(X),
        "genuine_count": int(np.sum(y_true == 0)),
        "impostor_count": int(np.sum(y_true == 1)),
        "metrics": {
            "roc_auc": round(roc_auc, 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "accuracy": round(float((tp + tn) / (tp + tn + fp + fn)), 4),
            "false_acceptance_rate_far": round(float(fn / (fn + tp + 1e-6)), 4), # Impostor falsely accepted as genuine
            "false_rejection_rate_frr": round(float(fp / (fp + tn + 1e-6)), 4)   # Genuine falsely flagged as anomaly
        },
        "confusion_matrix": {
            "true_negatives_genuine_accepted": int(tn),
            "false_positives_genuine_blocked": int(fp),
            "false_negatives_impostor_accepted": int(fn),
            "true_positives_impostor_blocked": int(tp)
        },
        "roc_curve": roc_points,
        "score_distribution": {
            "genuine_mean_risk": round(float(np.mean(genuine_risks)), 2),
            "genuine_std_risk": round(float(np.std(genuine_risks)), 2),
            "impostor_mean_risk": round(float(np.mean(impostor_risks)), 2),
            "impostor_std_risk": round(float(np.std(impostor_risks)), 2),
            "sample_genuine_risks": genuine_risks[:8],
            "sample_impostor_risks": impostor_risks[:8]
        }
    }
