from typing import Tuple
from app.config import settings

def update_session_risk_score(
    previous_risk: float,
    new_instantaneous_risk: float,
    alpha: float = settings.RISK_EMA_ALPHA
) -> Tuple[float, str, bool, bool]:
    """
    Apply Asymmetric Exponential Moving Average (EMA):
    - When risk rises (threat/anomaly): escalate rapidly (alpha = 0.72) so impostor is detected quickly.
    - When risk falls: decay conservatively (alpha = 0.18) so impostor cannot evade detection simply by pausing.

    Returns:
    (smoothed_risk, risk_state, is_mfa_required, is_locked)
    """
    if previous_risk is None or previous_risk < 0:
        smoothed = new_instantaneous_risk
    else:
        # Asymmetric responsive threat escalation
        if new_instantaneous_risk > previous_risk:
            effective_alpha = 0.72
        else:
            effective_alpha = 0.18

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
