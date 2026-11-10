import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.quotes.models import AdditionalService, Quote, QuoteAuditLog, QuoteTranslationItem
from app.modules.quotes.services import quote_service as quote_service_module
from app.modules.quotes.services.quote_expiration import expire_overdue_quotes
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.shared.database import get_db

LOCKED_STATUSES = ["pending", "approved", "reproved", "cancelled"]
BASE_PERMISSIONS = ("quotes.read", "quotes.write", "quotes.approve", "service_orders.read")


def make_user(db: Session, permission_codes: tuple[str, ...]) -> User:
    permissions = []
    for code in permission_codes:
        permission = db.query(Permission).filter_by(code=code).first()
        if permission is None:
            permission = Permission(code=code)
            db.add(permission)
        permissions.append(permission)
    role = Role(name=f"Orcamentos {uuid.uuid4().hex[:8]}", permissions=permissions)
    user = User(
        id=uuid.uuid4(),
        email=f"orcamentos-{uuid.uuid4().hex[:10]}@example.com",
        password_hash="unused",
        role="user",
        roles=[role],
    )
    db.add(user)
    db.flush()
    return user


def act_as(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(user.id), email=user.email
    )


@pytest.fixture
def db_client(isolated_db_session: Session, monkeypatch):
    monkeypatch.setattr(quote_service_module, "QuoteReceiptService", MagicMock())
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    act_as(make_user(isolated_db_session, (*BASE_PERMISSIONS, "quotes.reopen")))
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def make_quote(db: Session, status: str) -> Quote:
    company = Company(
        legal_name="Empresa de Teste Ltda",
        trade_name="Empresa de Teste",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        industry="juridico",
        phone="11987654321",
        email=f"cliente-{uuid.uuid4().hex[:10]}@example.com",
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
            file_url="https://storage.test/contrato.pdf",
            estimated_value=Decimal("100.00"),
        )
    ]
    quote.additional_services = [
        AdditionalService(description="Revisão", price=Decimal("20.00"), status="pending")
    ]
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def edit_requests(quote: Quote) -> list[tuple[str, str, dict | None]]:
    item_id = quote.items[0].id
    service_id = quote.additional_services[0].id
    return [
        ("patch", f"/api/quotes/{quote.id}", {"customer_name": "Outro nome"}),
        (
            "post",
            f"/api/quotes/{quote.id}/translation-items",
            {"source_language": "pt-BR", "target_language": "es-ES"},
        ),
        (
            "patch",
            f"/api/quotes/{quote.id}/translation-items/{item_id}",
            {"source_language": "es-ES"},
        ),
        ("delete", f"/api/quotes/{quote.id}/translation-items/{item_id}", None),
        (
            "post",
            "/api/quotes/additional-services",
            {"quote_id": str(quote.id), "description": "Diagramação", "price": "15.00"},
        ),
        ("patch", f"/api/quotes/additional-services/{service_id}", {"price": "99.00"}),
        ("patch", f"/api/quotes/additional-services/{service_id}/status", {"status": "approved"}),
        ("delete", f"/api/quotes/additional-services/{service_id}", None),
    ]


def call(client: TestClient, method: str, url: str, payload: dict | None):
    if payload is None:
        return getattr(client, method)(url)
    return getattr(client, method)(url, json=payload)


def test_new_quote_starts_in_draft(db_client: TestClient):
    response = db_client.post("/api/quotes", json={})

    assert response.status_code == 201
    assert response.json()["status"] == "draft"


@pytest.mark.parametrize("status", LOCKED_STATUSES)
def test_locked_quote_rejects_every_change(
    db_client: TestClient, isolated_db_session: Session, status: str
):
    quote = make_quote(isolated_db_session, status)

    for method, url, payload in edit_requests(quote):
        response = call(db_client, method, url, payload)
        assert response.status_code == 409, (method, url, response.text)
        assert "precisa estar em preparação" in response.json()["detail"]

    isolated_db_session.expire_all()
    stored = isolated_db_session.get(Quote, quote.id)
    assert stored.customer_name == "Maria Teste"
    assert len(stored.items) == 1
    assert stored.items[0].source_language == "pt-BR"
    assert len(stored.additional_services) == 1
    assert stored.additional_services[0].price == Decimal("20.00")
    assert stored.additional_services[0].status == "pending"


@pytest.mark.parametrize("status", LOCKED_STATUSES)
def test_locked_quote_queries_keep_working(
    db_client: TestClient, isolated_db_session: Session, status: str
):
    quote = make_quote(isolated_db_session, status)

    assert db_client.get("/api/quotes", params={"status": status}).status_code == 200
    assert db_client.get(f"/api/quotes/{quote.id}/translation-items").status_code == 200
    assert (
        db_client.get("/api/quotes/additional-services", params={"quote_id": str(quote.id)})
    ).status_code == 200
    service_id = quote.additional_services[0].id
    assert db_client.get(f"/api/quotes/additional-services/{service_id}").status_code == 200


def test_draft_quote_allows_every_change(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "draft")

    for method, url, payload in edit_requests(quote):
        response = call(db_client, method, url, payload)
        assert response.status_code in {200, 201, 204}, (method, url, response.text)


def test_locked_message_explains_the_status(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "pending")

    response = db_client.patch(f"/api/quotes/{quote.id}", json={"customer_name": "Outro"})

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Este orçamento está aguardando aprovação do cliente. "
        "O orçamento precisa estar em preparação para ser alterado."
    )


def test_draft_quote_cannot_be_approved_before_sending(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_quote(isolated_db_session, "draft")

    response = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})

    assert response.status_code == 409
    assert isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).count() == 0


def test_full_lifecycle_with_reopen_keeps_single_service_order(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_quote(isolated_db_session, "draft")

    sent = db_client.post(f"/api/quotes/{quote.id}/send")
    assert sent.status_code == 200
    assert sent.json()["status"] == "pending"
    assert db_client.post(f"/api/quotes/{quote.id}/send").status_code == 409

    approved = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})
    assert approved.status_code == 200
    service_order = isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).one()
    original_items = [
        (item.id, item.source_language, item.target_language, item.price)
        for item in service_order.items
    ]
    assert len(original_items) == 1

    reopened = db_client.post(
        f"/api/quotes/{quote.id}/reopen", json={"reason": "Cliente enviou novo documento"}
    )
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "draft"
    assert reopened.json()["service_order_id"] == str(service_order.id)

    audit = isolated_db_session.query(QuoteAuditLog).filter_by(quote_id=quote.id).one()
    assert audit.action == "reopen"
    assert audit.previous_status == "approved"
    assert audit.new_status == "draft"
    assert audit.reason == "Cliente enviou novo documento"
    assert audit.actor_email is not None
    assert audit.actor_user_id is not None
    assert audit.created_at is not None

    added = db_client.post(
        f"/api/quotes/{quote.id}/translation-items",
        json={
            "source_language": "pt-BR",
            "target_language": "es-ES",
            "document_type": "Procuração",
            "file_url": "https://storage.test/procuracao.pdf",
            "estimated_value": "50.00",
        },
    )
    assert added.status_code == 201

    assert db_client.post(f"/api/quotes/{quote.id}/send").status_code == 200
    reapproved = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})
    assert reapproved.status_code == 200
    assert reapproved.json()["service_order_id"] == str(service_order.id)

    isolated_db_session.expire_all()
    orders = isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).all()
    assert [order.id for order in orders] == [service_order.id]
    current_items = [
        (item.id, item.source_language, item.target_language, item.price)
        for item in isolated_db_session.query(ServiceOrderItem)
        .filter_by(service_order_id=service_order.id)
        .all()
    ]
    assert current_items == original_items
    assert db_client.get(f"/api/service-orders/{service_order.id}").status_code == 200


@pytest.mark.parametrize("status", ["pending", "reproved"])
def test_reopen_from_pending_and_reproved(
    db_client: TestClient, isolated_db_session: Session, status: str
):
    quote = make_quote(isolated_db_session, status)

    response = db_client.post(f"/api/quotes/{quote.id}/reopen", json={"reason": "Ajuste"})

    assert response.status_code == 200
    assert response.json()["status"] == "draft"
    assert (
        db_client.patch(f"/api/quotes/{quote.id}", json={"customer_name": "Novo"}).status_code
        == 200
    )


@pytest.mark.parametrize("status", ["draft", "cancelled"])
def test_reopen_rejects_draft_and_cancelled(
    db_client: TestClient, isolated_db_session: Session, status: str
):
    quote = make_quote(isolated_db_session, status)

    response = db_client.post(f"/api/quotes/{quote.id}/reopen", json={"reason": "Ajuste"})

    assert response.status_code == 409
    assert isolated_db_session.query(QuoteAuditLog).filter_by(quote_id=quote.id).count() == 0


@pytest.mark.parametrize("payload", [{}, {"reason": ""}, {"reason": "   "}])
def test_reopen_requires_reason(db_client: TestClient, isolated_db_session: Session, payload):
    quote = make_quote(isolated_db_session, "approved")

    response = db_client.post(f"/api/quotes/{quote.id}/reopen", json=payload)

    assert response.status_code == 422
    isolated_db_session.refresh(quote)
    assert quote.status == "approved"


def test_reopen_requires_permission(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "approved")
    act_as(make_user(isolated_db_session, BASE_PERMISSIONS))

    response = db_client.post(f"/api/quotes/{quote.id}/reopen", json={"reason": "Ajuste"})

    assert response.status_code == 403
    isolated_db_session.refresh(quote)
    assert quote.status == "approved"


def age_quote(db: Session, quote: Quote, days: int) -> None:
    quote.validity_starts_at = datetime.now(UTC) - timedelta(days=days)
    db.commit()


@pytest.mark.parametrize("status", ["draft", "pending"])
def test_overdue_quote_is_cancelled_when_listing(
    db_client: TestClient, isolated_db_session: Session, status: str
):
    quote = make_quote(isolated_db_session, status)
    age_quote(isolated_db_session, quote, 31)

    response = db_client.get("/api/quotes")

    assert response.status_code == 200
    listed = next(item for item in response.json()["items"] if item["id"] == str(quote.id))
    assert listed["status"] == "cancelled"
    audit = isolated_db_session.query(QuoteAuditLog).filter_by(quote_id=quote.id).one()
    assert audit.action == "expire"
    assert audit.previous_status == status
    assert audit.actor_user_id is None


def test_quote_within_validity_is_not_cancelled(
    db_client: TestClient, isolated_db_session: Session
):
    quote = make_quote(isolated_db_session, "pending")
    age_quote(isolated_db_session, quote, 29)

    response = db_client.get("/api/quotes")

    listed = next(item for item in response.json()["items"] if item["id"] == str(quote.id))
    assert listed["status"] == "pending"
    assert listed["valid_until"] is not None


def test_overdue_draft_rejects_changes(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "draft")
    age_quote(isolated_db_session, quote, 31)

    response = db_client.patch(f"/api/quotes/{quote.id}", json={"customer_name": "Outro"})

    assert response.status_code == 409
    assert "prazo de validade expirou" in response.json()["detail"]


def test_overdue_pending_cannot_be_approved(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "pending")
    age_quote(isolated_db_session, quote, 31)

    response = db_client.patch(f"/api/quotes/{quote.id}/status", json={"status": "approved"})

    assert response.status_code == 409
    isolated_db_session.expire_all()
    assert isolated_db_session.get(Quote, quote.id).status == "cancelled"
    assert isolated_db_session.query(ServiceOrder).filter_by(quote_id=quote.id).count() == 0


def test_reopen_restarts_validity(db_client: TestClient, isolated_db_session: Session):
    quote = make_quote(isolated_db_session, "approved")
    age_quote(isolated_db_session, quote, 45)

    response = db_client.post(f"/api/quotes/{quote.id}/reopen", json={"reason": "Ajuste"})

    assert response.status_code == 200
    valid_until = datetime.fromisoformat(response.json()["valid_until"])
    assert valid_until - datetime.now(UTC) > timedelta(days=29)
    assert db_client.post(f"/api/quotes/{quote.id}/send").status_code == 200


def test_expiration_job_cancels_only_overdue_quotes(isolated_db_session: Session):
    overdue = make_quote(isolated_db_session, "pending")
    age_quote(isolated_db_session, overdue, 31)
    valid = make_quote(isolated_db_session, "draft")
    approved = make_quote(isolated_db_session, "approved")
    age_quote(isolated_db_session, approved, 60)

    assert expire_overdue_quotes(isolated_db_session) == 1

    isolated_db_session.expire_all()
    assert isolated_db_session.get(Quote, overdue.id).status == "cancelled"
    assert isolated_db_session.get(Quote, valid.id).status == "draft"
    assert isolated_db_session.get(Quote, approved.id).status == "approved"
