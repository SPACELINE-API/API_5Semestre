from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_request_endpoint():
    with patch("app.modules.quotes.routes.RequestService") as MockRequestService:
        instance = MockRequestService.return_value

        class MockRequest:
            id = "123e4567-e89b-12d3-a456-426614174000"
            customer_name = "João Silva"
            enterprise = "Padilhas Company"
            email = "joao@teste.com"
            original_language = "Português"
            translation_language = "Francês"
            customer_need = "Contrato Social"
            status = "pending"
            request_date = "2026-09-15"

        instance.create.return_value = MockRequest()

        response = client.post(
            "/api/quotes/requests",
            json={
                "customer_name": "João Silva",
                "enterprise": "Padilhas Company",
                "email": "joao@teste.com",
                "original_language": "Português",
                "translation_language": "Francês",
                "customer_need": "Contrato Social",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "123e4567-e89b-12d3-a456-426614174000"


def test_create_request_endpoint_invalid_schema():
    response = client.post("/api/quotes/requests", json="invalid_payload")
    assert response.status_code == 422