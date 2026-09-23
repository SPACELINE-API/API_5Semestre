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
            document = None

        instance.create.return_value = MockRequest()

        response = client.post(
            "/api/quotes/requests",
            data={
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

        created_request = instance.create.call_args.args[0]
        assert created_request.document is None


def test_create_request_endpoint_with_document():
    with patch("app.modules.quotes.routes.RequestService") as MockRequestService:
        instance = MockRequestService.return_value

        class MockRequest:
            id = "123e4567-e89b-12d3-a456-426614174001"
            customer_name = "Maria Souza"
            enterprise = "Empresa Y"
            email = "maria@teste.com"
            original_language = "Português"
            translation_language = "Inglês"
            customer_need = "Diploma"
            status = "pending"
            request_date = "2026-09-15"
            document = b"conteudo binario do arquivo"

        instance.create.return_value = MockRequest()

        response = client.post(
            "/api/quotes/requests",
            data={
                "customer_name": "Maria Souza",
                "enterprise": "Empresa Y",
                "email": "maria@teste.com",
                "original_language": "Português",
                "translation_language": "Inglês",
                "customer_need": "Diploma",
            },
            files={
                "document": ("diploma.pdf", b"conteudo binario do arquivo", "application/pdf"),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "123e4567-e89b-12d3-a456-426614174001"

        created_request = instance.create.call_args.args[0]
        assert created_request.document == b"conteudo binario do arquivo"


def test_create_request_endpoint_invalid_schema():
    response = client.post(
        "/api/quotes/requests",
        data={"customer_name": "João Silva"},
    )
    assert response.status_code == 422
