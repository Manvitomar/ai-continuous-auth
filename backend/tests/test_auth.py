import pytest

def test_register_and_login(client):
    # 1. Register a new user
    reg_payload = {
        "username": "alice_test",
        "email": "alice@example.com",
        "password": "Password123!"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["username"] == "alice_test"
    assert user_data["is_enrolled"] is False
    assert user_data["consent_given"] is False

    # 2. Reject duplicate registration
    res_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_dup.status_code == 400

    # 3. Login with correct password
    login_payload = {
        "username": "alice_test",
        "password": "Password123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    token_data = res_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert "session_token" in token_data
    assert token_data["user"]["username"] == "alice_test"

    # 4. Login with wrong password
    res_bad = client.post("/api/v1/auth/login", json={
        "username": "alice_test",
        "password": "WrongPassword!"
    })
    assert res_bad.status_code == 401

def test_authenticated_profile_and_consent(client):
    # Register & Login
    client.post("/api/v1/auth/register", json={
        "username": "bob_test",
        "email": "bob@example.com",
        "password": "SecurePassword123!"
    })
    res_login = client.post("/api/v1/auth/login", json={
        "username": "bob_test",
        "password": "SecurePassword123!"
    })
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access /me
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "bob_test"

    # Grant Consent
    res_consent = client.post("/api/v1/auth/consent", headers=headers, json={"consent_given": True})
    assert res_consent.status_code == 200
    assert res_consent.json()["consent_given"] is True
