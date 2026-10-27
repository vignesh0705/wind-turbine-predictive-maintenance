import io
import math
import uuid
from datetime import datetime, timezone
import pytest
from bson import ObjectId
from starlette.testclient import TestClient

from app.main import app
from app.ml.model_manager import model_manager
from app.ml.result_adapter import sanitize_record, sanitize_value
from app.database.mongodb import get_database


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    # Unique email for testing
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "name": "Test Engineer",
        "email": unique_email,
        "password": "Password123!",
    }
    signup_resp = client.post("/api/auth/signup", json=signup_data)
    assert signup_resp.status_code == 201

    login_resp = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "Password123!",
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 1. Test Health Endpoint
def test_health_endpoints(client):
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json() == {"status": "ok", "service": "wind-turbine-ai-backend"}

    r2 = client.get("/api/health")
    assert r2.status_code == 200
    assert r2.json() == {"status": "ok", "service": "wind-turbine-ai-backend"}


@pytest.mark.asyncio
async def test_mongodb_connection():
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.config.settings import settings
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=3000)
    db = client[settings.MONGO_DB_NAME]
    res = await db.command("ping")
    assert res.get("ok") == 1.0
    client.close()


# 3. Test Signup
def test_signup(client):
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post("/api/auth/signup", json={
        "name": "Jane Wind",
        "email": email,
        "password": "SecurePassword999",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email
    assert "id" in body

    # Duplicate signup should fail with 409
    dup_resp = client.post("/api/auth/signup", json={
        "name": "Jane Wind",
        "email": email,
        "password": "SecurePassword999",
    })
    assert dup_resp.status_code == 409


# 4. Test Login
def test_login(client):
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/signup", json={
        "name": "John Doe",
        "email": email,
        "password": "TestPassword123",
    })

    # Successful login
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "TestPassword123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email

    # Invalid login
    bad_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword",
    })
    assert bad_resp.status_code == 401


# 5. Test Protected /me
def test_protected_me(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "email" in data
    assert "id" in data


# 6. Test Unauthorized Access
def test_unauthorized_access(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    resp2 = client.get("/api/datasets")
    assert resp2.status_code == 401

    resp3 = client.get("/api/dashboard/summary")
    assert resp3.status_code == 401


# 7. Test Model Loading & Artifacts
def test_model_loading():
    assert model_manager.loaded is True
    assert model_manager.farm_a is not None
    assert model_manager.farm_b is not None

    fa = model_manager.get_farm_models("A")
    assert len(fa.perf_features) == 20
    assert len(fa.anomaly_features) == 21
    assert fa.target_col == "power_30_avg"

    fb = model_manager.get_farm_models("B")
    assert len(fb.perf_features) == 21
    assert len(fb.anomaly_features) == 22
    assert fb.target_col == "power_62_avg"


# 8. Test Result Serialization
def test_result_serialization():
    raw = {
        "_id": ObjectId(),
        "nan_val": float("nan"),
        "inf_val": float("inf"),
        "time": datetime.now(timezone.utc),
        "nested": {"score": float("nan"), "val": 42},
    }
    cleaned = sanitize_record(raw)
    assert isinstance(cleaned["_id"], str)
    assert cleaned["nan_val"] is None
    assert cleaned["inf_val"] is None
    assert isinstance(cleaned["time"], str)
    assert cleaned["nested"]["score"] is None
    assert cleaned["nested"]["val"] == 42


# 9. Test Dataset Upload, Compatibility, and Quality
def test_dataset_upload_and_compatibility(client, auth_headers):
    fa = model_manager.get_farm_models("A")
    all_fa_features = list(set(fa.perf_features + fa.anomaly_features))
    header = ",".join(["timestamp", "turbine_id"] + all_fa_features)
    row_1 = ",".join(["2026-09-01T00:00:00", "WTG_01"] + ["0.5"] * len(all_fa_features))
    row_2 = ",".join(["2026-09-01T00:10:00", "WTG_01"] + ["0.6"] * len(all_fa_features))
    csv_content = f"{header}\n{row_1}\n{row_2}".encode("utf-8")

    files = {"file": ("compatible_scada.csv", io.BytesIO(csv_content), "text/csv")}
    upload_resp = client.post("/api/datasets/upload", files=files, headers=auth_headers)
    assert upload_resp.status_code == 201
    dataset_info = upload_resp.json()
    assert dataset_info["compatible"] is True
    assert dataset_info["farm"] == "A"
    dataset_id = dataset_info["id"]

    # Check compatibility endpoint
    compat_resp = client.get(f"/api/datasets/{dataset_id}/compatibility", headers=auth_headers)
    assert compat_resp.status_code == 200
    assert compat_resp.json()["compatible"] is True
    assert compat_resp.json()["farm"] == "A"

    # Check summary endpoint
    sum_resp = client.get(f"/api/datasets/{dataset_id}/summary", headers=auth_headers)
    assert sum_resp.status_code == 200
    assert sum_resp.json()["rows"] == 2

    # Check quality endpoint
    qual_resp = client.get(f"/api/datasets/{dataset_id}/quality", headers=auth_headers)
    assert qual_resp.status_code == 200
    assert qual_resp.json()["missing_cells"] == 0


# 10. Test Invalid Dataset Upload
def test_invalid_dataset_upload(client, auth_headers):
    # Non-csv extension
    files = {"file": ("dataset.txt", io.BytesIO(b"hello world"), "text/plain")}
    resp = client.post("/api/datasets/upload", files=files, headers=auth_headers)
    assert resp.status_code == 400


# 11. Test Single ML Inference Endpoint
def test_single_inference_endpoint(client, auth_headers):
    fa = model_manager.get_farm_models("A")
    features = {feat: 0.1 for feat in set(fa.perf_features + fa.anomaly_features)}

    payload = {
        "farm": "A",
        "asset_id": "WTG_05",
        "timestamp": "2026-09-30T12:00:00Z",
        "actual_power": 0.5,
        "features": features,
    }
    resp = client.post("/api/inference/single", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["farm"] == "Wind Farm A"
    assert res["asset_id"] == "WTG_05"
    assert "health_index" in res
    assert "risk_score" in res
    assert res["risk_category"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "dominant_component" in res
    assert "components" in res


# 12. Test Batch Inference, Dashboard, Turbines, and Alerts
def test_batch_inference_and_fleet_flow(client, auth_headers):
    # Upload small compatible dataset
    fa = model_manager.get_farm_models("A")
    all_features = list(set(fa.perf_features + fa.anomaly_features))
    header = ",".join(["timestamp", "turbine_id"] + all_features)
    row_1 = ",".join(["2026-09-01T00:00:00", "WTG_01"] + ["0.5"] * len(all_features))
    row_2 = ",".join(["2026-09-01T00:10:00", "WTG_02"] + ["2.5"] * len(all_features))
    csv_content = f"{header}\n{row_1}\n{row_2}".encode("utf-8")

    files = {"file": ("batch_scada.csv", io.BytesIO(csv_content), "text/csv")}
    up = client.post("/api/datasets/upload", files=files, headers=auth_headers)
    dataset_id = up.json()["id"]

    # Trigger batch inference
    b_resp = client.post("/api/inference/batch", json={"dataset_id": dataset_id, "farm": "A"}, headers=auth_headers)
    assert b_resp.status_code == 202
    analysis_id = b_resp.json()["analysis_id"]

    # Poll status
    st_resp = client.get(f"/api/inference/{analysis_id}/status", headers=auth_headers)
    assert st_resp.status_code == 200
    assert "status" in st_resp.json()

    # Results
    res_resp = client.get(f"/api/inference/{analysis_id}/results", headers=auth_headers)
    assert res_resp.status_code == 200
    results = res_resp.json()
    assert results["total_rows"] == 2
    assert results["total_turbines"] == 2

    # Check turbines
    turb_resp = client.get("/api/turbines", headers=auth_headers)
    assert turb_resp.status_code == 200
    turbines = turb_resp.json()
    assert len(turbines) >= 2

    # Check turbine history
    t_hist = client.get("/api/turbines/WTG_01/history", headers=auth_headers)
    assert t_hist.status_code == 200

    # Check dashboard summary
    dash_resp = client.get("/api/dashboard/summary", headers=auth_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "total_turbines" in dash_data
    assert "average_health" in dash_data

    # Check alerts endpoint
    alerts_resp = client.get("/api/alerts", headers=auth_headers)
    assert alerts_resp.status_code == 200


# 13. Test Explainability Endpoints
def test_explainability_endpoints(client, auth_headers):
    # Global explainability
    resp_a = client.get("/api/explainability/global?farm=A", headers=auth_headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["farm"] == "Wind Farm A"
    assert "feature_importances" in data_a
    assert len(data_a["feature_importances"]) > 0

    # Local explainability
    resp_loc = client.get("/api/explainability/WTG_01?farm=A", headers=auth_headers)
    assert resp_loc.status_code == 200
    data_loc = resp_loc.json()
    assert data_loc["asset_id"] == "WTG_01"


# 14. Test Weather Endpoint
def test_weather_endpoint(client, auth_headers):
    resp = client.get("/api/weather/current?latitude=54.5&longitude=9.5", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "temperature_celsius" in data
    assert "wind_speed_ms" in data
    assert "source" in data

