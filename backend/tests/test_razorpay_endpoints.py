from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_payments_endpoints():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    print("Health check OK")

    # 2. Payments router is registered
    # Verify openapi schema includes payments
    res = client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    paths = schema.get("paths", {})
    assert "/api/payments/create-order" in paths or "/payments/create-order" in paths
    assert "/api/payments/verify" in paths or "/payments/verify" in paths
    print("Payment API routes registered in OpenAPI schema OK!")

if __name__ == "__main__":
    test_payments_endpoints()
