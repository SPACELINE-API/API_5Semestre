import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.routes import (
    documents_write_permission,
    quotes_approve_permission,
    quotes_read_permission,
    quotes_write_permission,
    requests_read_permission,
    requests_write_permission,
)
from app.shared.database import get_db


@pytest.fixture(autouse=True)
def allow_route_permissions_for_legacy_endpoint_tests():
    for permission_dependency in (
        documents_write_permission,
        quotes_approve_permission,
        quotes_read_permission,
        quotes_write_permission,
        requests_read_permission,
        requests_write_permission,
    ):
        app.dependency_overrides[permission_dependency] = lambda: None
    yield
    for permission_dependency in (
        documents_write_permission,
        quotes_approve_permission,
        quotes_read_permission,
        quotes_write_permission,
        requests_read_permission,
        requests_write_permission,
    ):
        app.dependency_overrides.pop(permission_dependency, None)


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


def test_list_quotes_includes_linked_company_name_and_legacy_fallback(
    db_client: TestClient, isolated_db_session: Session
):
    company = Company(
        legal_name="Empresa Legal Ltda",
        trade_name="Empresa Atual",
        cnpj="12.345.678/0001-90",
        industry="Serviços",
        phone="11999999999",
        email="empresa@teste.com",
        zip_code="01000-000",
        street="Rua Um",
        number="1",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
    )
    linked_quote = Quote(
        company=company,
        enterprise="Nome antigo",
        status="pending",
    )
    legacy_quote = Quote(enterprise="Empresa legada", status="pending")
    empty_quote = Quote(status="pending")
    isolated_db_session.add_all([linked_quote, legacy_quote, empty_quote])
    isolated_db_session.commit()

    response = db_client.get("/api/quotes")

    assert response.status_code == 200
    names_by_id = {item["id"]: item["company_name"] for item in response.json()["items"]}
    assert names_by_id[str(linked_quote.id)] == "Empresa Atual"
    assert names_by_id[str(legacy_quote.id)] == "Empresa legada"
    assert names_by_id[str(empty_quote.id)] is None


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
