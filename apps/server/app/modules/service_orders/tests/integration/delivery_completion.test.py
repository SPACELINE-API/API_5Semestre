import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_SAIDA,
    REVIEW_APPROVED,
    REVIEW_CHANGES_REQUESTED,
    REVIEW_PENDING,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    ServiceOrderItem,
)
from app.modules.service_orders.services.delivery_service import ServiceOrderDeliveryService
from app.modules.service_orders.services.service_order_service import ServiceOrderService
from app.modules.service_orders.services.translator_item_service import TranslatorItemService


@pytest.fixture
def db_session(isolated_db_session: Session) -> Session:
    return isolated_db_session


def _make_order_and_item(db: Session) -> tuple[ServiceOrder, ServiceOrderItem]:
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
    db.add(company)
    db.flush()

    quote = Quote(
        company_id=company.id,
        status="approved",
        customer_name="Maria",
        email=company.email,
    )
    db.add(quote)
    db.flush()

    order = ServiceOrder(quote_id=quote.id, company_id=company.id, project_name="Projeto")
    db.add(order)
    db.flush()

    item = ServiceOrderItem(
        service_order_id=order.id,
        source_language="pt-BR",
        target_language="en-US",
        status=STATUS_EM_ANALISE,
    )
    db.add(item)
    db.flush()
    return order, item


def _add_output_file(
    db: Session,
    order: ServiceOrder,
    item: ServiceOrderItem,
    *,
    filename: str,
    uploaded_at: datetime,
    review_status: str,
    delivery_status: str,
) -> ServiceOrderFile:
    document = ServiceOrderFile(
        service_order_id=order.id,
        service_order_item_id=item.id,
        filename=filename,
        file_url=f"https://storage.example/{filename}",
        storage_path=f"orders/{order.id}/{filename}",
        direction=DIRECTION_SAIDA,
        uploaded_at=uploaded_at,
        review_status=review_status,
        delivery_status=delivery_status,
    )
    db.add(document)
    db.flush()
    return document


def test_superseded_changes_requested_file_does_not_block_completion(db_session: Session) -> None:
    order, item = _make_order_and_item(db_session)
    now = datetime.now(UTC)
    old_file = _add_output_file(
        db_session,
        order,
        item,
        filename="versao-anterior.pdf",
        uploaded_at=now,
        review_status=REVIEW_CHANGES_REQUESTED,
        delivery_status="not_sent",
    )
    latest_file = _add_output_file(
        db_session,
        order,
        item,
        filename="versao-corrigida.pdf",
        uploaded_at=now + timedelta(seconds=1),
        review_status=REVIEW_APPROVED,
        delivery_status="sent",
    )
    db_session.commit()

    ServiceOrderDeliveryService(db_session).finalize_already_sent_order(order.id)

    db_session.refresh(item)
    db_session.refresh(old_file)
    db_session.refresh(latest_file)
    assert item.status == STATUS_CONCLUIDA
    assert item.completed_at is not None
    assert old_file.delivery_status == "not_sent"
    assert latest_file.delivery_status == "sent"


def test_approved_sent_order_level_file_allows_completion_without_item_link(
    db_session: Session,
) -> None:
    """An order-level delivery may be approved/sent without a linked item."""
    order, item = _make_order_and_item(db_session)
    order_level_file = ServiceOrderFile(
        service_order_id=order.id,
        service_order_item_id=None,
        filename="entrega-da-os.pdf",
        file_url="https://storage.example/entrega-da-os.pdf",
        storage_path=f"orders/{order.id}/entrega-da-os.pdf",
        direction=DIRECTION_SAIDA,
        uploaded_at=datetime.now(UTC),
        review_status=REVIEW_APPROVED,
        delivery_status="sent",
    )
    db_session.add(order_level_file)
    db_session.commit()

    ServiceOrderDeliveryService(db_session).finalize_already_sent_order(order.id)

    db_session.refresh(item)
    db_session.refresh(order_level_file)
    assert item.status == STATUS_CONCLUIDA
    assert item.completed_at is not None
    assert order_level_file.service_order_item_id is None
    assert order_level_file.delivery_status == "sent"


def test_order_level_sent_file_does_not_override_newer_pending_item_file(
    db_session: Session,
) -> None:
    order, item = _make_order_and_item(db_session)
    pending_item_file = _add_output_file(
        db_session,
        order,
        item,
        filename="item-pendente.pdf",
        uploaded_at=datetime.now(UTC),
        review_status=REVIEW_PENDING,
        delivery_status="not_sent",
    )
    order_level_file = ServiceOrderFile(
        service_order_id=order.id,
        service_order_item_id=None,
        filename="arquivo-da-os-enviado.pdf",
        file_url="https://storage.example/arquivo-da-os-enviado.pdf",
        storage_path=f"orders/{order.id}/arquivo-da-os-enviado.pdf",
        direction=DIRECTION_SAIDA,
        uploaded_at=pending_item_file.uploaded_at + timedelta(seconds=1),
        review_status=REVIEW_APPROVED,
        delivery_status="sent",
    )
    db_session.add(order_level_file)
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        ServiceOrderDeliveryService(db_session).finalize_already_sent_order(order.id)

    db_session.refresh(item)
    assert error.value.status_code == 409
    assert item.status == STATUS_EM_ANALISE
    assert item.completed_at is None


@pytest.mark.parametrize(
    "latest_review_status",
    [REVIEW_PENDING, REVIEW_CHANGES_REQUESTED],
)
def test_current_output_documents_excludes_historical_approved_item_versions(
    db_session: Session,
    latest_review_status: str,
) -> None:
    order, item = _make_order_and_item(db_session)
    now = datetime.now(UTC)
    historical_approved_file = _add_output_file(
        db_session,
        order,
        item,
        filename="historico-aprovado.pdf",
        uploaded_at=now,
        review_status=REVIEW_APPROVED,
        delivery_status="sent",
    )
    latest_file = _add_output_file(
        db_session,
        order,
        item,
        filename="versao-atual.pdf",
        uploaded_at=now + timedelta(seconds=1),
        review_status=latest_review_status,
        delivery_status="not_sent",
    )

    current_documents = ServiceOrderDeliveryService._current_output_documents(
        [historical_approved_file, latest_file]
    )

    assert current_documents == [latest_file]


def test_finalization_is_rejected_when_order_level_file_is_not_sent(
    db_session: Session,
) -> None:
    order, _item = _make_order_and_item(db_session)
    db_session.add(
        ServiceOrderFile(
            service_order_id=order.id,
            service_order_item_id=None,
            filename="entrega-pendente.pdf",
            file_url="https://storage.example/entrega-pendente.pdf",
            storage_path=f"orders/{order.id}/entrega-pendente.pdf",
            direction=DIRECTION_SAIDA,
            uploaded_at=datetime.now(UTC),
            review_status=REVIEW_APPROVED,
            delivery_status="not_sent",
        )
    )
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        ServiceOrderDeliveryService(db_session).finalize_already_sent_order(order.id)

    assert error.value.status_code == 409


@pytest.mark.parametrize(
    ("review_status", "delivery_status"),
    [
        (REVIEW_PENDING, "sent"),
        (REVIEW_CHANGES_REQUESTED, "not_sent"),
    ],
)
def test_latest_unreviewed_or_changes_requested_file_keeps_item_open(
    db_session: Session,
    review_status: str,
    delivery_status: str,
) -> None:
    order, item = _make_order_and_item(db_session)
    now = datetime.now(UTC)
    _add_output_file(
        db_session,
        order,
        item,
        filename="versao-anterior.pdf",
        uploaded_at=now,
        review_status=REVIEW_CHANGES_REQUESTED,
        delivery_status="not_sent",
    )
    latest_file = _add_output_file(
        db_session,
        order,
        item,
        filename="versao-atual.pdf",
        uploaded_at=now + timedelta(seconds=1),
        review_status=review_status,
        delivery_status=delivery_status,
    )
    db_session.commit()

    ServiceOrderDeliveryService(db_session)._complete_order_if_ready(order)

    db_session.refresh(item)
    db_session.refresh(latest_file)
    assert item.status == STATUS_EM_ANALISE
    assert item.completed_at is None


def test_deleting_item_with_pending_file_does_not_block_completion(
    db_session: Session,
) -> None:
    order, item = _make_order_and_item(db_session)
    remaining_item = ServiceOrderItem(
        service_order_id=order.id,
        source_language="pt-BR",
        target_language="es-ES",
        status=STATUS_EM_ANALISE,
    )
    db_session.add(remaining_item)
    db_session.flush()
    now = datetime.now(UTC)
    _add_output_file(
        db_session,
        order,
        item,
        filename="entrega-pendente.pdf",
        uploaded_at=now,
        review_status=REVIEW_PENDING,
        delivery_status="not_sent",
    )
    remaining_file = _add_output_file(
        db_session,
        order,
        remaining_item,
        filename="entrega-enviada.pdf",
        uploaded_at=now - timedelta(seconds=1),
        review_status=REVIEW_APPROVED,
        delivery_status="sent",
    )
    db_session.commit()

    ServiceOrderService(db_session).delete_item(order.id, item.id)
    ServiceOrderDeliveryService(db_session)._complete_order_if_ready(order)

    db_session.refresh(remaining_item)
    db_session.refresh(remaining_file)
    orphaned_file = (
        db_session.query(ServiceOrderFile)
        .filter(ServiceOrderFile.filename == "entrega-pendente.pdf")
        .one()
    )
    assert orphaned_file.service_order_item_id is None
    assert remaining_item.status == STATUS_CONCLUIDA
    assert remaining_file.delivery_status == "sent"


def test_item_with_approved_unsent_file_cannot_be_deleted(db_session: Session) -> None:
    order, item = _make_order_and_item(db_session)
    _add_output_file(
        db_session,
        order,
        item,
        filename="entrega-aprovada.pdf",
        uploaded_at=datetime.now(UTC),
        review_status=REVIEW_APPROVED,
        delivery_status="not_sent",
    )
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        ServiceOrderService(db_session).delete_item(order.id, item.id)

    assert error.value.status_code == 409
    assert db_session.get(ServiceOrderItem, item.id) is not None


def test_new_upload_timestamp_advances_after_timestamp_collision(db_session: Session) -> None:
    order, item = _make_order_and_item(db_session)
    timestamp = datetime.now(UTC)
    _add_output_file(
        db_session,
        order,
        item,
        filename="versao-1.pdf",
        uploaded_at=timestamp,
        review_status=REVIEW_CHANGES_REQUESTED,
        delivery_status="not_sent",
    )
    db_session.commit()

    next_timestamp = TranslatorItemService(db_session)._next_delivery_uploaded_at(item.id)

    assert next_timestamp > timestamp
