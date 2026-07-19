"""Smoke tests against a live database (expects `python -m app.seed` to have run).

Run: cd backend && ./.venv/Scripts/python -m pytest -q
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] in {"ok", "degraded"}


def test_dashboard_summary_shape():
    r = client.get("/api/v1/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    for key in ("total_requests", "open_requests", "closed_requests", "resolution_rate"):
        assert key in body


def test_list_requests_pagination():
    r = client.get("/api/v1/requests?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 5
    assert len(body["items"]) <= 5


def test_create_and_close_request():
    created = client.post(
        "/api/v1/requests",
        json={"complaint_type": "Noise - Residential", "borough": "BROOKLYN",
              "priority": "high", "description": "Loud party next door"},
    )
    assert created.status_code == 201, created.text
    rid = created.json()["id"]

    closed = client.post(
        f"/api/v1/requests/{rid}/close",
        json={"resolution_description": "Warning issued."},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"


def test_ai_query_grounded():
    r = client.post("/api/v1/ai/query",
                    json={"question": "Which borough has the highest resolution time?"})
    assert r.status_code == 200
    body = r.json()
    assert body["intent"] == "resolution"
    assert body["provider"] == "mock"
