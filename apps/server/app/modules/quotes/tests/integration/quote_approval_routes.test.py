import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.quotes.models import Quote, QuoteTranslationItem
from app.modules.quotes.routes import quotes_approve_permission
from app.modules.quotes.services import quote_service as quote_service_module
from app.modules.service_orders.models.service_order import ServiceOrder
from app.shared.database import get_db


@pytest.fixture
def db_client(client: TestClient, isolated_db_session: Session, monkeypatch):
    monkeypatch.setattr(quote_service_module, "QuoteReceiptService", MagicMock())
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[quotes_approve_permission] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="aprovador@example.com"
    )
    yield client
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(quotes_approve_permission, None)


def make_pending_quote(db: Session, file_url: str | None) -> Quote:
    suffix = uuid.uuid4().hex[:10]
    company = Company(
        legal_name="Empresa de Teste Ltda",
        trade_name="Empresa de Teste",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        industry="juridico",
        phone="11987654321",
        email=f"cliente-{suffix}@example.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    quote = Quote(company=company, status="pending", customer_name="Maria Teste")
    quote.items = [
        QuoteTranslationItem(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato",
            file_url=file_url,
            estimated_value=Decimal("100.00"),
        )
    ]
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def test_quote_with_document_without_file_cannot_be_approved(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_pending_quote(isolated_db_session, file_url=None)

    response = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})

    assert response.status_code == 422
    assert (
        response.json()["detail"]
        == "Anexe o arquivo de todos os documentos antes de aprovar o orçamento."
    )
    isolated_db_session.refresh(quote)
    assert quote.status == "pending"
    assert isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).count() == 0


def test_quote_with_all_document_files_can_be_approved(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_pending_quote(isolated_db_session, file_url="https://storage.example/contrato.pdf")

    response = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).count() == 1
