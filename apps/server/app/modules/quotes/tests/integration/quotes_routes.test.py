from unittest.mock import patch


def test_create_quote_endpoint(client, override_get_db):
    with patch("app.modules.quotes.routes.QuoteService") as MockQuoteService:
        instance = MockQuoteService.return_value

        class MockQuote:
            id = "123e4567-e89b-12d3-a456-426614174000"
            status = "draft"
            created_at = "2026-09-17T10:00:00Z"
            updated_at = "2026-09-17T10:00:00Z"

        instance.create_quote.return_value = MockQuote()

        response = client.post("/api/quotes", json={"status": "draft"})

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "123e4567-e89b-12d3-a456-426614174000"
        assert data["status"] == "draft"


def test_create_quote_endpoint_invalid_schema(client):
    response = client.post("/api/quotes", json="invalid_payload")
    assert response.status_code == 422
