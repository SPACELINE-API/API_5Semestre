import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.routes import quotes_read_permission
from app.shared.database import get_db


@pytest.fixture(autouse=True)
def allow_route_permissions():
    app.dependency_overrides[quotes_read_permission] = lambda: None
    yield
    app.dependency_overrides.pop(quotes_read_permission, None)


@pytest.fixture
def db_client(client: TestClient, isolated_db_session: Session):
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    yield client
    app.dependency_overrides.pop(get_db, None)


def _approved_quote(session: Session, **receipt_fields) -> Quote:
    company = Company(
        legal_name="Empresa Teste Ltda",
        trade_name="Empresa Teste",
        cnpj="12.345.678/0001-90",
        industry="Serviços",
        phone="11999999999",
        email="empresa@teste.com",
        zip_code="01000-000",
        street="Rua Teste",
        number="123",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
    )
    quote = Quote(
        company=company,
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
        customer_name="João Silva",
        **receipt_fields,
    )
    session.add_all([company, quote])
    session.commit()
    return quote


def test_get_quote_receipt_endpoint(db_client: TestClient, isolated_db_session: Session):
    quote = _approved_quote(
        isolated_db_session,
        receipt_status="sent",
        receipt_pdf_url="http://storage.test/receipt.pdf",
        receipt_generated_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
        receipt_sent_at=datetime(2026, 11, 3, 10, 30, tzinfo=UTC),
    )

    response = db_client.get(f"/api/quotes/{quote.id}/receipt")

    assert response.status_code == 200
    data = response.json()
    assert data["quote_id"] == str(quote.id)
    assert data["company_id"] == str(quote.company_id)
    assert data["status"] == "sent"
    assert data["pdf_url"] == "http://storage.test/receipt.pdf"
    assert data["generated_at"] is not None
    assert data["sent_at"] is not None
    assert data["error_message"] is None


def test_get_quote_receipt_error_status(db_client: TestClient, isolated_db_session: Session):
    quote = _approved_quote(
        isolated_db_session,
        receipt_status="error",
        receipt_error_message="Erro ao gerar PDF: boom",
    )

    response = db_client.get(f"/api/quotes/{quote.id}/receipt")

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["error_message"] == "Erro ao gerar PDF: boom"


def test_get_quote_receipt_not_generated(db_client: TestClient, isolated_db_session: Session):
    quote = _approved_quote(isolated_db_session)

    response = db_client.get(f"/api/quotes/{quote.id}/receipt")

    assert response.status_code == 404


def test_get_quote_receipt_unknown_quote(db_client: TestClient):
    response = db_client.get(f"/api/quotes/{uuid.uuid4()}/receipt")

    assert response.status_code == 404


def test_download_quote_receipt_endpoint(db_client: TestClient, isolated_db_session: Session):
    quote = _approved_quote(
        isolated_db_session,
        receipt_status="sent",
        receipt_pdf_url="http://storage.test/receipt.pdf",
    )

    response = db_client.get(f"/api/quotes/{quote.id}/receipt/download")

    assert response.status_code == 200
    assert response.json() == {"download_url": "http://storage.test/receipt.pdf"}


def test_download_quote_receipt_without_pdf(db_client: TestClient, isolated_db_session: Session):
    quote = _approved_quote(isolated_db_session, receipt_status="error")

    response = db_client.get(f"/api/quotes/{quote.id}/receipt/download")

    assert response.status_code == 404


def test_download_quote_receipt_unknown_quote(db_client: TestClient):
    response = db_client.get(f"/api/quotes/{uuid.uuid4()}/receipt/download")

    assert response.status_code == 404
