import pytest
import pyotp
from app.models.user import User
from app.models.session import UserSession

def test_sensitive_action_risk_gating(client, db_session):
    # 1. Create and authenticate user
    client.post("/api/v1/auth/register", json={
        "username": "carol_test",
        "email": "carol@example.com",
        "password": "CarolPassword123!"
    })
    res_login = client.post("/api/v1/auth/login", json={
        "username": "carol_test",
        "password": "CarolPassword123!"
    })
    token = res_login.json()["access_token"]
    session_token = res_login.json()["session_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Execute sensitive action while risk is LOW (initial risk = 5.0)
    action_payload = {
        "action_type": "WIRE_TRANSFER",
        "amount": 500.0,
        "target": "ACADEMIC_FEES_OFFICE",
        "session_token": session_token
    }
    res_action = client.post("/api/v1/actions/execute", headers=headers, json=action_payload)
    assert res_action.status_code == 200
    assert res_action.json()["success"] is True

    # 3. Simulate high risk in session (> 70)
    session_obj = db_session.query(UserSession).filter(UserSession.session_token == session_token).first()
    session_obj.current_risk_score = 88.5
    session_obj.risk_state = "HIGH"
    session_obj.is_mfa_challenged = True
    session_obj.is_mfa_verified = False
    db_session.commit()

    # 4. Attempt sensitive action while risk is HIGH -> Expect 403 Forbidden
    res_blocked = client.post("/api/v1/actions/execute", headers=headers, json=action_payload)
    assert res_blocked.status_code == 403
    err_detail = res_blocked.json()["detail"]
    assert err_detail["requires_mfa"] is True

    # 5. Perform TOTP setup & verification to unlock session
    res_setup = client.post("/api/v1/mfa/setup", headers=headers)
    assert res_setup.status_code == 200
    totp_secret = res_setup.json()["secret"]

    # Generate valid TOTP code
    totp = pyotp.TOTP(totp_secret)
    valid_code = totp.now()

    # Verify challenge
    res_verify = client.post("/api/v1/mfa/verify", headers=headers, json={
        "code": valid_code,
        "session_token": session_token
    })
    assert res_verify.status_code == 200
    assert res_verify.json()["verified"] is True
    assert res_verify.json()["risk_score_reset"] is True

    # 6. Retry sensitive action now that MFA challenge is cleared -> Expect 200 OK
    res_unlocked = client.post("/api/v1/actions/execute", headers=headers, json=action_payload)
    assert res_unlocked.status_code == 200
    assert res_unlocked.json()["success"] is True
