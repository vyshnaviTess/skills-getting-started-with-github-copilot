from fastapi.testclient import TestClient
from src.app import app as application_app

client = TestClient(application_app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "pytest_user@example.com"

    # Ensure test starts without the email present
    participants = client.get("/activities").json()[activity]["participants"]
    if email in participants:
        client.delete(f"/activities/{activity}/unregister", params={"email": email})

    # Sign up
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    after = client.get("/activities").json()[activity]["participants"]
    assert email in after

    # Unregister
    r2 = client.delete(f"/activities/{activity}/unregister", params={"email": email})
    assert r2.status_code == 200
    final = client.get("/activities").json()[activity]["participants"]
    assert email not in final
