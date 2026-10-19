import uuid
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders import routes as service_orders_routes
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_ENTRADA,
    DIRECTION_SAIDA,
    REVIEW_APPROVED,
    REVIEW_CHANGES_REQUESTED,
    REVIEW_PENDING,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    ServiceOrderItem,
)
from app.modules.service_orders.services import delivery_service as delivery_service_module
from app.modules.service_orders.services import translator_item_service as translator_item_module
from app.modules.service_orders.services.delivery_service import ServiceOrderDeliveryService
from app.modules.service_orders.services.file_review_service import ServiceOrderFileReviewService
from app.modules.service_orders.services.translator_item_service import TranslatorItemService
from app.modules.translators.models.translator import Translator
from app.shared.database import get_db


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


def make_order(db_session: Session) -> ServiceOrder:
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
    db_session.add(company)
    db_session.flush()
    quote = Quote(
        company_id=company.id, status="approved", customer_name="Maria", email=company.email
    )
    db_session.add(quote)
    db_session.flush()
    order = ServiceOrder(quote_id=quote.id, company_id=company.id, project_name="Projeto")
    db_session.add(order)
    db_session.commit()
    return order


def add_delivery_template(db_session: Session) -> None:
    db_session.add(
        ServiceOrderEmailTemplate(
            key=SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
            subject="Tradução concluída",
            body_html="<p>Olá, {{nome_cliente}}</p>",
        )
    )
    db_session.commit()


def make_translator(db_session: Session) -> Translator:
    translator = Translator(
        name="Tradutora Teste",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.commit()
    return translator


def make_item(
    db_session: Session,
    order: ServiceOrder,
    translator: Translator | None = None,
    status: str = STATUS_EM_ANALISE,
) -> ServiceOrderItem:
    item = ServiceOrderItem(
        service_order_id=order.id,
        source_language="pt-BR",
        target_language="en-US",
        status=status,
        translator_id=translator.id if translator else None,
    )
    db_session.add(item)
    db_session.commit()
    return item


def make_delivery(
    db_session: Session,
    order: ServiceOrder,
    item: ServiceOrderItem | None,
    review_status: str = REVIEW_PENDING,
    direction: str = DIRECTION_SAIDA,
) -> ServiceOrderFile:
    file = ServiceOrderFile(
        service_order_id=order.id,
        service_order_item_id=item.id if item else None,
        filename="traducao.pdf",
        file_url="https://storage.example/traducao.pdf",
        storage_path="reviews/traducao.pdf",
        direction=direction,
        review_status=review_status,
    )
    db_session.add(file)
    db_session.commit()
    return file


def test_approve_marks_file_approved_and_keeps_the_item_open_until_delivery(
    db_session: Session,
) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)

    reviewed = ServiceOrderFileReviewService(db_session).approve(order.id, file.id)

    assert reviewed.review_status == REVIEW_APPROVED
    assert reviewed.reviewed_at is not None
    assert reviewed.review_note is None
    db_session.refresh(item)
    assert item.status == STATUS_EM_ANALISE
    assert item.completed_at is None


def test_request_changes_stores_the_note_and_reopens_the_item(db_session: Session) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)

    reviewed = ServiceOrderFileReviewService(db_session).request_changes(
        order.id, file.id, "  Revisar o glossário  "
    )

    assert reviewed.review_status == REVIEW_CHANGES_REQUESTED
    assert reviewed.review_note == "Revisar o glossário"
    assert reviewed.reviewed_at is not None
    db_session.refresh(item)
    assert item.status == STATUS_EM_ANDAMENTO


def test_a_delivery_can_only_be_reviewed_once(db_session: Session) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)
    service = ServiceOrderFileReviewService(db_session)
    service.approve(order.id, file.id)

    with pytest.raises(HTTPException) as approve_error:
        service.approve(order.id, file.id)
    with pytest.raises(HTTPException) as changes_error:
        service.request_changes(order.id, file.id, "Ajustar")

    assert approve_error.value.status_code == 409
    assert changes_error.value.status_code == 409


def test_review_rejects_files_from_another_order(db_session: Session) -> None:
    order = make_order(db_session)
    other_order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)

    with pytest.raises(HTTPException) as error:
        ServiceOrderFileReviewService(db_session).approve(other_order.id, file.id)

    assert error.value.status_code == 404


def test_review_rejects_files_that_are_not_translator_deliveries(db_session: Session) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    staff_file = make_delivery(db_session, order, None)
    incoming_file = make_delivery(db_session, order, item, direction=DIRECTION_ENTRADA)
    service = ServiceOrderFileReviewService(db_session)

    for file in (staff_file, incoming_file):
        with pytest.raises(HTTPException) as error:
            service.approve(order.id, file.id)
        assert error.value.status_code == 409


def test_translator_delivery_starts_pending_and_shows_the_review_feedback(
    db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        translator_item_module,
        "upload_service_order_file",
        lambda filename, _data, _content_type: f"https://storage.example/{filename}",
    )
    order = make_order(db_session)
    translator = make_translator(db_session)
    item = make_item(db_session, order, translator, status=STATUS_EM_ANDAMENTO)
    service = TranslatorItemService(db_session)

    delivered = service.deliver(
        item.id, translator.email, "traducao.pdf", b"conteudo", "application/pdf"
    )

    assert delivered.status == STATUS_EM_ANALISE
    assert delivered.delivered_files[0].review_status == REVIEW_PENDING
    assert delivered.delivered_files[0].review_note is None

    file = db_session.query(ServiceOrderFile).filter_by(service_order_item_id=item.id).one()
    ServiceOrderFileReviewService(db_session).request_changes(order.id, file.id, "Corrigir datas")

    refreshed = service.get_item(item.id, translator.email)
    assert refreshed.status == STATUS_EM_ANDAMENTO
    assert refreshed.delivered_files[0].review_status == REVIEW_CHANGES_REQUESTED
    assert refreshed.delivered_files[0].review_note == "Corrigir datas"


def test_translator_cannot_send_again_while_delivery_is_pending_or_approved(
    db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        translator_item_module,
        "upload_service_order_file",
        lambda filename, _data, _content_type: f"https://storage.example/{filename}",
    )
    order = make_order(db_session)
    translator = make_translator(db_session)
    item = make_item(db_session, order, translator, status=STATUS_EM_ANDAMENTO)
    service = TranslatorItemService(db_session)
    service.deliver(item.id, translator.email, "v1.pdf", b"conteudo", "application/pdf")

    with pytest.raises(HTTPException) as pending_error:
        service.deliver(item.id, translator.email, "v2.pdf", b"conteudo", "application/pdf")
    assert pending_error.value.status_code == 409

    file = db_session.query(ServiceOrderFile).filter_by(service_order_item_id=item.id).one()
    db_session.query(ServiceOrderItem).filter_by(id=item.id).update({"status": STATUS_EM_ANALISE})
    db_session.commit()
    ServiceOrderFileReviewService(db_session).approve(order.id, file.id)
    db_session.query(ServiceOrderItem).filter_by(id=item.id).update({"status": STATUS_EM_ANDAMENTO})
    db_session.commit()

    with pytest.raises(HTTPException) as approved_error:
        service.deliver(item.id, translator.email, "v3.pdf", b"conteudo", "application/pdf")
    assert approved_error.value.status_code == 409
    assert db_session.query(ServiceOrderFile).filter_by(service_order_item_id=item.id).count() == 1


def test_translator_can_send_a_new_version_after_changes_are_requested(
    db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        translator_item_module,
        "upload_service_order_file",
        lambda filename, _data, _content_type: f"https://storage.example/{filename}",
    )
    order = make_order(db_session)
    translator = make_translator(db_session)
    item = make_item(db_session, order, translator, status=STATUS_EM_ANDAMENTO)
    service = TranslatorItemService(db_session)
    service.deliver(item.id, translator.email, "v1.pdf", b"conteudo", "application/pdf")
    first = db_session.query(ServiceOrderFile).filter_by(service_order_item_id=item.id).one()
    ServiceOrderFileReviewService(db_session).request_changes(order.id, first.id, "Corrigir datas")
    first.uploaded_at = datetime(2026, 1, 1, tzinfo=UTC)
    db_session.commit()

    delivered = service.deliver(item.id, translator.email, "v2.pdf", b"conteudo", "application/pdf")

    assert delivered.status == STATUS_EM_ANALISE
    assert delivered.delivered_files[0].filename == "v2.pdf"
    assert delivered.delivered_files[0].review_status == REVIEW_PENDING


def test_staff_uploaded_deliveries_default_to_approved(db_session: Session) -> None:
    order = make_order(db_session)
    file = ServiceOrderFile(
        service_order_id=order.id,
        filename="final.pdf",
        file_url="https://storage.example/final.pdf",
        direction=DIRECTION_SAIDA,
    )
    db_session.add(file)
    db_session.commit()

    assert file.review_status == REVIEW_APPROVED


@pytest.fixture
def review_client(db_session: Session):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[service_orders_routes.documents_write_permission] = lambda: (
        SupabaseAuthenticatedUser(id=str(uuid.uuid4()), email="atendente@example.com")
    )
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_approve_route_returns_the_reviewed_file(
    review_client: TestClient, db_session: Session
) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)

    response = review_client.post(f"/api/service-orders/{order.id}/files/{file.id}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["review_status"] == REVIEW_APPROVED
    assert body["service_order_item_id"] == str(item.id)


def test_request_changes_route_requires_a_meaningful_note(
    review_client: TestClient, db_session: Session
) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)
    url = f"/api/service-orders/{order.id}/files/{file.id}/request-changes"

    too_short = review_client.post(url, json={"note": "ok"})
    valid = review_client.post(url, json={"note": "Ajustar a terminologia"})

    assert too_short.status_code == 422
    assert valid.status_code == 200
    assert valid.json()["review_status"] == REVIEW_CHANGES_REQUESTED
    assert valid.json()["review_note"] == "Ajustar a terminologia"


def test_review_routes_require_authentication(client: TestClient) -> None:
    approve = client.post(f"/api/service-orders/{uuid.uuid4()}/files/{uuid.uuid4()}/approve")
    changes = client.post(
        f"/api/service-orders/{uuid.uuid4()}/files/{uuid.uuid4()}/request-changes",
        json={"note": "Ajustar"},
    )

    assert approve.status_code == 401
    assert changes.status_code == 401


def test_only_approved_documents_are_sent_to_the_client(db_session: Session, monkeypatch) -> None:
    sent_emails: list[dict] = []
    monkeypatch.setattr(delivery_service_module, "service_order_file_exists", lambda _path: True)
    monkeypatch.setattr(delivery_service_module, "download_service_order_file", lambda _path: b"x")
    monkeypatch.setattr(
        delivery_service_module, "send_email", lambda **email: sent_emails.append(email)
    )
    add_delivery_template(db_session)
    order = make_order(db_session)
    translator = make_translator(db_session)
    approved_item = make_item(db_session, order, translator, status=STATUS_CONCLUIDA)
    pending_item = make_item(db_session, order, translator)
    approved_file = make_delivery(db_session, order, approved_item, REVIEW_APPROVED)
    pending_file = make_delivery(db_session, order, pending_item, REVIEW_PENDING)
    service = ServiceOrderDeliveryService(db_session)

    deliveries = service.send_translated_documents(order.id)

    assert [delivery.document_file_id for delivery in deliveries] == [approved_file.id]
    db_session.refresh(pending_file)
    assert pending_file.delivery_status != "sent"
    db_session.refresh(pending_item)
    assert pending_item.status != STATUS_CONCLUIDA


def test_unapproved_documents_cannot_be_selected_for_delivery(
    db_session: Session, monkeypatch
) -> None:
    from app.modules.service_orders.schemas.service_order import ServiceOrderDeliveryRequest

    monkeypatch.setattr(delivery_service_module, "service_order_file_exists", lambda _path: True)
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    pending_file = make_delivery(db_session, order, item, REVIEW_PENDING)

    with pytest.raises(HTTPException) as error:
        ServiceOrderDeliveryService(db_session).send_translated_documents(
            order.id, ServiceOrderDeliveryRequest(file_ids=[pending_file.id])
        )

    assert error.value.status_code == 409
    assert "aprovados" in error.value.detail


def test_review_timestamps_use_timezone_aware_values(db_session: Session) -> None:
    order = make_order(db_session)
    item = make_item(db_session, order, make_translator(db_session))
    file = make_delivery(db_session, order, item)

    reviewed = ServiceOrderFileReviewService(db_session).approve(order.id, file.id)

    assert reviewed.reviewed_at is not None
    assert reviewed.reviewed_at.tzinfo is not None
    assert reviewed.reviewed_at <= datetime.now(UTC)
