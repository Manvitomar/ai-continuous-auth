import pytest
from app.ml.risk_engine import update_session_risk_score

def test_ema_smoothing():
    # Fresh session starts with first score
    smoothed, state, mfa_req, locked = update_session_risk_score(previous_risk=None, new_instantaneous_risk=15.0)
    assert smoothed == 15.0
    assert state == "LOW"
    assert not mfa_req

    # A single momentary spike does not instantly jump to 90%
    smoothed_spike, state_spike, _, _ = update_session_risk_score(previous_risk=15.0, new_instantaneous_risk=85.0)
    assert smoothed_spike < 80.0, "EMA smoothing should prevent single instant jump to full peak"
    
    # Continued anomalies steadily escalate
    smoothed_sustained = smoothed_spike
    for _ in range(4):
        smoothed_sustained, state_sustained, mfa_sustained, locked_sustained = update_session_risk_score(
            previous_risk=smoothed_sustained,
            new_instantaneous_risk=95.0
        )
    assert smoothed_sustained > 70.0
    assert state_sustained == "HIGH"
    assert mfa_sustained is True
    assert locked_sustained is True
