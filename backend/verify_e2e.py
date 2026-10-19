import sys
import httpx
import pyotp
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_e2e():
    print("=================================================================")
    print(" STARTING ACADEMIC CONTINUOUS AUTHENTICATION END-TO-END AUDIT")
    print("=================================================================")

    # 1. Health check
    res_health = httpx.get("http://127.0.0.1:8000/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    print(" [1/9] Health Check: OK (FastAPI + SQLite + IsolationForest)")

    # 2. Register User
    username = f"dr_alan_turing"
    reg_payload = {
        "username": username,
        "email": "alan.turing@cambridge.ac.uk",
        "password": "UniversalTuringMachine1936!"
    }
    res_reg = httpx.post(f"{BASE_URL}/auth/register", json=reg_payload)
    if res_reg.status_code == 400 and "already registered" in res_reg.text:
        print(" [2/9] Registration: User already registered, proceeding to login.")
    else:
        assert res_reg.status_code == 201, f"Registration failed: {res_reg.text}"
        print(f" [2/9] Registration: SUCCESS (Created {username})")

    # 3. Login
    res_login = httpx.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": "UniversalTuringMachine1936!"
    })
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    token_data = res_login.json()
    token = token_data["access_token"]
    session_token = token_data["session_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f" [3/9] Login: SUCCESS (Bearer token & Session {session_token[:14]}...)")

    # 4. Consent
    res_consent = httpx.post(f"{BASE_URL}/auth/consent", headers=headers, json={"consent_given": True})
    assert res_consent.status_code == 200, f"Consent update failed: {res_consent.text}"
    print(" [4/9] Consent Update: SUCCESS (Zero-Content telemetry consented)")

    # 5. Enrollment: Train Isolation Forest
    import random
    rng = random.Random(42)
    samples = []
    for i in range(20):
        samples.append({
            "mean_hold_time": round(95.0 + rng.gauss(0, 3.5), 2),
            "std_hold_time": round(18.0 + rng.gauss(0, 1.5), 2),
            "mean_flight_time": round(140.0 + rng.gauss(0, 7.0), 2),
            "std_flight_time": round(30.0 + rng.gauss(0, 2.5), 2),
            "typing_speed_cpm": round(270.0 + rng.gauss(0, 12.0), 2),
            "pause_ratio": round(max(0.05, min(0.4, 0.15 + rng.gauss(0, 0.02))), 2),
            "mean_velocity": round(0.85 + rng.gauss(0, 0.04), 3),
            "max_velocity": round(2.40 + rng.gauss(0, 0.15), 3),
            "mean_acceleration": round(0.045 + rng.gauss(0, 0.003), 4),
            "mean_jerk": round(0.012 + rng.gauss(0, 0.001), 4),
            "curvature_ratio": round(max(1.0, 1.25 + rng.gauss(0, 0.05)), 2),
            "mean_click_duration": round(85.0 + rng.gauss(0, 4.0), 2),
            "movement_to_click_ratio": round(14.0 + rng.gauss(0, 1.2), 2),
            "scroll_intensity": round(120.0 + rng.gauss(0, 8.0), 2)
        })
    res_enroll = httpx.post(f"{BASE_URL}/biometric/enroll", headers=headers, json={"samples": samples})
    assert res_enroll.status_code == 200, f"Enrollment failed: {res_enroll.text}"
    enroll_data = res_enroll.json()
    print(f" [5/9] Model Enrollment: SUCCESS (Trained Isolation Forest v{enroll_data['model_version']} on {enroll_data['samples_enrolled']} windows)")

    # 6. Evaluation metrics check
    res_eval = httpx.get(f"{BASE_URL}/biometric/evaluation", headers=headers)
    assert res_eval.status_code == 200, f"Evaluation fetch failed: {res_eval.text}"
    eval_data = res_eval.json()
    auc_score = eval_data["metrics"]["roc_auc"]
    assert auc_score >= 0.80, f"ROC AUC too low: {auc_score}"
    print(f" [6/9] Academic Benchmarks: SUCCESS (ROC AUC = {auc_score:.4f}, Accuracy = {eval_data['metrics']['accuracy']*100:.1f}%)")

    # 7. Execute sensitive action while risk is LOW
    res_act1 = httpx.post(f"{BASE_URL}/actions/execute", headers=headers, json={
        "action_type": "RESEARCH_GRANT_TRANSFER",
        "amount": 2500.0,
        "target": "ACADEMIC_REGISTRAR",
        "session_token": session_token
    })
    assert res_act1.status_code == 200, f"Low risk action failed: {res_act1.text}"
    print(f" [7/9] Low-Risk Gated Action: APPROVED (TXN: {res_act1.json()['transaction_id']})")

    # 8. Anomaly Attack Simulation (Trigger High Risk)
    bot_attack_features = {
        "mean_hold_time": 15.0,
        "std_hold_time": 0.2,
        "mean_flight_time": 18.0,
        "std_flight_time": 0.3,
        "typing_speed_cpm": 950.0,
        "pause_ratio": 0.01,
        "mean_velocity": 9.5,
        "max_velocity": 28.0,
        "mean_acceleration": 1.4,
        "mean_jerk": 0.01,
        "curvature_ratio": 1.001,
        "mean_click_duration": 12.0,
        "movement_to_click_ratio": 1.0,
        "scroll_intensity": 0.0
    }
    # Stream multiple anomalous windows to trigger EMA escalation
    for _ in range(4):
        res_anom = httpx.post(f"{BASE_URL}/telemetry/evaluate", headers=headers, json={
            "features": bot_attack_features,
            "session_token": session_token,
            "is_simulation": True,
            "simulation_label": "SIMULATED_BOT_ATTACK"
        })
    anom_data = res_anom.json()
    assert anom_data["risk_score"] > 70.0, f"Risk score did not escalate: {anom_data['risk_score']}"
    assert anom_data["is_mfa_required"] is True
    print(f" [8/9] Anomaly Attack Escalation: SUCCESS (Risk Score escalated to {anom_data['risk_score']}%, MFA Challenged = True)")

    # 9. Test that sensitive action is now BLOCKED
    res_blocked = httpx.post(f"{BASE_URL}/actions/execute", headers=headers, json={
        "action_type": "RESEARCH_GRANT_TRANSFER",
        "amount": 2500.0,
        "target": "ACADEMIC_REGISTRAR",
        "session_token": session_token
    })
    assert res_blocked.status_code == 403, f"Expected 403 Forbidden, got {res_blocked.status_code}"
    print(" [9/9a] Risk Gating Enforcement: SUCCESS (Sensitive action blocked with 403 Forbidden)")

    # 10. TOTP Setup and Recovery Unlock
    res_mfa_setup = httpx.post(f"{BASE_URL}/mfa/setup", headers=headers)
    assert res_mfa_setup.status_code == 200
    totp_secret = res_mfa_setup.json()["secret"]
    valid_code = pyotp.TOTP(totp_secret).now()

    res_unlock = httpx.post(f"{BASE_URL}/mfa/verify", headers=headers, json={
        "code": valid_code,
        "session_token": session_token
    })
    assert res_unlock.status_code == 200
    assert res_unlock.json()["verified"] is True
    assert res_unlock.json()["risk_score_reset"] is True
    print(" [9/9b] Step-Up TOTP Verification: SUCCESS (Session unlocked, risk reset to 5.0%)")

    # 11. Retry sensitive action now that session is unlocked
    res_retry = httpx.post(f"{BASE_URL}/actions/execute", headers=headers, json={
        "action_type": "RESEARCH_GRANT_TRANSFER",
        "amount": 2500.0,
        "target": "ACADEMIC_REGISTRAR",
        "session_token": session_token
    })
    assert res_retry.status_code == 200, f"Unlocked action failed: {res_retry.text}"
    print(f" [9/9c] Post-Recovery Gated Action: APPROVED (TXN: {res_retry.json()['transaction_id']})")

    print("=================================================================")
    print(" ALL 9 END-TO-END ACADEMIC INTEGRATION STAGES PASSED PERFECTLY! ")
    print("=================================================================")

if __name__ == "__main__":
    try:
        run_e2e()
    except Exception as e:
        print(f"E2E AUDIT FAILED: {e}", file=sys.stderr)
        sys.exit(1)
