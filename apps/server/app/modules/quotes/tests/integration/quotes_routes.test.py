import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum
from app.shared.database import get_db


@pytest.fixture
def db_client(client: TestClient, isolated_db_session: Session):
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    yield client
    app.dependency_overrides.pop(get_db, None)


def test_create_quote_endpoint_persists_quote(db_client: TestClient, isolated_db_session: Session):
    response = db_client.post("/api/quotes", json={})

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert isolated_db_session.get(Quote, uuid.UUID(data["id"])) is not None


def test_create_quote_endpoint_invalid_schema(client: TestClient):
    response = client.post("/api/quotes", json="invalid_payload")
    assert response.status_code == 422


def test_generate_quote_from_request_endpoint_uses_approved_request(
    db_client: TestClient, isolated_db_session: Session
):
    request = Request(
        customer_name="João Silva",
        enterprise="Empresa X",
        email="joao@teste.com",
        original_language="Português",
        translation_language="Inglês",
        customer_need="Contrato social",
        status=StatusEnum.APPROVED,
    )
    isolated_db_session.add(request)
    isolated_db_session.flush()

    response = db_client.post(f"/api/quotes/from-request/{request.id}")

    assert response.status_code == 201
    data = response.json()
    assert data["request_id"] == str(request.id)
    assert data["status"] == "pending"
    assert data["customer_name"] == request.customer_name


def test_generate_quote_from_request_endpoint_rejects_invalid_uuid(client: TestClient):
    response = client.post("/api/quotes/from-request/not-an-uuid")

    assert response.status_code == 422
