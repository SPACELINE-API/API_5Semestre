from unittest.mock import patch


def test_create_quote_endpoint(client, override_get_db):
    with patch("app.modules.quotes.routes.QuoteService") as MockQuoteService:
        instance = MockQuoteService.return_value

        class MockQuote:
            id = "123e4567-e89b-12d3-a456-426614174000"
            status = "pending"
            created_at = "2026-09-17T10:00:00Z"
            updated_at = "2026-09-17T10:00:00Z"

        instance.create_quote.return_value = MockQuote()

        response = client.post("/api/quotes", json={})

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "123e4567-e89b-12d3-a456-426614174000"
        assert data["status"] == "pending"


def test_create_quote_endpoint_invalid_schema(client):
    response = client.post("/api/quotes", json="invalid_payload")
    assert response.status_code == 422


def test_generate_quote_from_request_endpoint(client):
    request_id = "123e4567-e89b-12d3-a456-426614174000"
    with patch("app.modules.quotes.routes.QuoteService") as MockQuoteService:
        instance = MockQuoteService.return_value

        class MockQuote:
            id = "223e4567-e89b-12d3-a456-426614174000"
            request_id = "123e4567-e89b-12d3-a456-426614174000"
            status = "pending"
            customer_name = "João Silva"
            enterprise = "Empresa X"
            email = "joao@teste.com"
            original_language = "Português"
            translation_language = "Inglês"
            customer_need = "Contrato social"
            created_at = "2026-09-22T10:00:00Z"
            updated_at = "2026-09-22T10:00:00Z"

        instance.generate_from_approved_request.return_value = MockQuote()

        response = client.post(f"/api/quotes/from-request/{request_id}")

    assert response.status_code == 201
    assert response.json()["request_id"] == request_id
    assert response.json()["status"] == "pending"


def test_generate_quote_from_request_endpoint_rejects_invalid_uuid(client):
    response = client.post("/api/quotes/from-request/not-an-uuid")

    assert response.status_code == 422
