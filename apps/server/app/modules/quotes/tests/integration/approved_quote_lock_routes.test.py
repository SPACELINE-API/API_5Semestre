import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.quotes.models import AdditionalService, Quote, QuoteTranslationItem
from app.modules.quotes.routes import (
    quotes_approve_permission,
    quotes_read_permission,
    quotes_write_permission,
)
from app.modules.quotes.services import quote_service as quote_service_module
from app.modules.quotes.services.quote_lock import APPROVED_QUOTE_LOCKED_MESSAGE
from app.modules.service_orders.models.service_order import ServiceOrder
from app.shared.database import get_db


@pytest.fixture
def db_client(client: TestClient, isolated_db_session: Session):
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[quotes_read_permission] = lambda: None
    app.dependency_overrides[quotes_write_permission] = lambda: None
    app.dependency_overrides[quotes_approve_permission] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="aprovador@example.com"
    )
    yield client
    for dependency in (
        get_db,
        quotes_read_permission,
        quotes_write_permission,
        quotes_approve_permission,
    ):
        app.dependency_overrides.pop(dependency, None)


def make_quote(db: Session, status: str) -> Quote:
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
    quote = Quote(company=company, status=status, customer_name="Maria Teste")
    quote.items = [
        QuoteTranslationItem(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato",
            file_url="https://storage.example/contrato.pdf",
            estimated_value=Decimal("100.00"),
        )
    ]
    quote.additional_services = [
        AdditionalService(description="Revisão", price=Decimal("50.00"), status="pending")
    ]
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def assert_locked(response) -> None:
    assert response.status_code == 409
    assert response.json()["detail"] == APPROVED_QUOTE_LOCKED_MESSAGE


def test_approved_quote_cannot_be_updated(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "approved")

    assert_locked(db_client.patch(f"/api/quotes/{quote.id}", json={"customer_name": "Outro"}))

    isolated_db_session.refresh(quote)
    assert quote.customer_name == "Maria Teste"


def test_approved_quote_rejects_translation_item_changes(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_quote(isolated_db_session, "approved")
    item = quote.items[0]
    base_path = f"/api/quotes/{quote.id}/translation-items"

    assert_locked(
        db_client.post(base_path, json={"source_language": "pt-BR", "target_language": "es-ES"})
    )
    assert_locked(db_client.patch(f"{base_path}/{item.id}", json={"target_language": "es-ES"}))
    assert_locked(db_client.delete(f"{base_path}/{item.id}"))

    isolated_db_session.expire_all()
    items = isolated_db_session.query(QuoteTranslationItem).filter_by(quote_id=quote.id).all()
    assert [persisted.target_language for persisted in items] == ["en-US"]


def test_approved_quote_rejects_additional_service_changes(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_quote(isolated_db_session, "approved")
    additional_service = quote.additional_services[0]
    base_path = "/api/quotes/additional-services"

    assert_locked(
        db_client.post(
            base_path,
            json={"quote_id": str(quote.id), "description": "Diagramação", "price": "30.00"},
        )
    )
    assert_locked(db_client.patch(f"{base_path}/{additional_service.id}", json={"price": "80.00"}))
    assert_locked(
        db_client.patch(f"{base_path}/{additional_service.id}/status", json={"status": "approved"})
    )
    assert_locked(db_client.delete(f"{base_path}/{additional_service.id}"))

    isolated_db_session.expire_all()
    services = isolated_db_session.query(AdditionalService).filter_by(quote_id=quote.id).all()
    assert [(service.price, service.status) for service in services] == [
        (Decimal("50.00"), "pending")
    ]


def test_approved_quote_reads_keep_working(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "approved")
    additional_service = quote.additional_services[0]

    assert db_client.get("/api/quotes").status_code == 200
    assert db_client.get(f"/api/quotes/{quote.id}/translation-items").status_code == 200
    assert (
        db_client.get("/api/quotes/additional-services", params={"quote_id": str(quote.id)})
    ).status_code == 200
    assert (
        db_client.get(f"/api/quotes/additional-services/{additional_service.id}")
    ).status_code == 200


def test_pending_quote_stays_editable(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "pending")
    item = quote.items[0]
    additional_service = quote.additional_services[0]
    items_path = f"/api/quotes/{quote.id}/translation-items"
    services_path = "/api/quotes/additional-services"

    assert (
        db_client.patch(f"/api/quotes/{quote.id}", json={"customer_name": "Outro"}).status_code
        == 200
    )
    assert (
        db_client.post(items_path, json={"source_language": "pt-BR", "target_language": "es-ES"})
    ).status_code == 201
    assert (
        db_client.patch(f"{items_path}/{item.id}", json={"target_language": "fr-FR"})
    ).status_code == 200
    assert db_client.delete(f"{items_path}/{item.id}").status_code == 204
    assert (
        db_client.post(
            services_path,
            json={"quote_id": str(quote.id), "description": "Diagramação", "price": "30.00"},
        )
    ).status_code == 201
    assert (
        db_client.patch(f"{services_path}/{additional_service.id}", json={"price": "80.00"})
    ).status_code == 200
    assert (
        db_client.patch(
            f"{services_path}/{additional_service.id}/status", json={"status": "approved"}
        )
    ).status_code == 200
    assert db_client.delete(f"{services_path}/{additional_service.id}").status_code == 204


def test_approving_quote_still_creates_service_order_with_its_items(
    db_client: TestClient, isolated_db_session: Session, monkeypatch
):
    monkeypatch.setattr(quote_service_module, "QuoteReceiptService", MagicMock())
    quote = make_quote(isolated_db_session, "pending")
    translation_item = quote.items[0]

    response = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    service_orders = isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).all()
    assert len(service_orders) == 1
    items = service_orders[0].items
    assert len(items) == 1
    assert items[0].quote_translation_item_id == translation_item.id
    assert items[0].price == translation_item.estimated_value
