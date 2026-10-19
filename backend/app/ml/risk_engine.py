from typing import Tuple
from app.config import settings

def update_session_risk_score(
    previous_risk: float,
    new_instantaneous_risk: float,
    alpha: float = settings.RISK_EMA_ALPHA
) -> Tuple[float, str, bool, bool]:
    """
    Apply Exponential Moving Average (EMA) to prevent single momentary anomalies
    from triggering false alarms, while escalating quickly on sustained divergence.

    Returns:
    (smoothed_risk, risk_state, is_mfa_required, is_locked)
    """
    # If starting a fresh session or resetting
    if previous_risk is None or previous_risk < 0:
        smoothed = new_instantaneous_risk
    else:
        # EMA Formula: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
        # If risk is jumping up sharply, allow a slightly faster rise (alpha * 1.2) for security responsiveness
        effective_alpha = min(0.60, alpha * 1.3) if new_instantaneous_risk > previous_risk else alpha
        smoothed = (effective_alpha * new_instantaneous_risk) + ((1.0 - effective_alpha) * previous_risk)

    smoothed = round(min(100.0, max(0.0, float(smoothed))), 2)

    if smoothed <= settings.RISK_LOW_THRESHOLD:
        state = "LOW"
        mfa_required = False
        locked = False
    elif smoothed <= settings.RISK_MEDIUM_THRESHOLD:
        state = "MEDIUM"
        mfa_required = False
        locked = False
    else:
        state = "HIGH"
        mfa_required = True
        locked = True

    return smoothed, state, mfa_required, locked
