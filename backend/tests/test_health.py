from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "database" in data
    assert "tavily" in data
    assert "bifrost" in data
    assert "gemini" in data
    assert data["tavily"]["status"] in ("connected", "disconnected", "not_configured")
    assert data["bifrost"]["status"] in ("connected", "disconnected", "not_configured")
    assert data["gemini"]["status"] in ("connected", "disconnected", "not_configured")
    assert "timestamp" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "VerityAI"
    assert "docs" in data
    assert "health" in data


def test_cors_headers():
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_invalid_verification_payload():
    response = client.post("/api/v1/verify", json={})
    assert response.status_code == 422
