"""Idempotent supplemental operational demo data.

This seed only inserts missing rows. It deliberately does not replace existing
translators, orders, files, deliveries, or invitations.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session, selectinload

from app.modules.quotes.models.quote import Quote
from app.modules.seed.seed_translators import SEED_TRANSLATORS
from app.modules.service_orders.models.invite import ServiceOrderItemInvite
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_delivery import ServiceOrderDelivery
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.modules.translators.models.translator import Translator

_NAMESPACE = uuid.UUID("04e74fe0-d89a-4c68-befd-3be9a9338ca1")
# The approved quote created by seed_demo_complement for Eduardo Nogueira.
SEED_DEMO_QUOTE_ID = uuid.UUID("06b4f4b2-70fc-5a8d-b972-ec954cd1521d")
SEED_DEMO_ORDER_ID = uuid.UUID("2a289eb5-4013-58a1-a747-29f4519a2002")


def _id(key: str) -> uuid.UUID:
    return uuid.uuid5(_NAMESPACE, key)


def seed_demo_operations(db: Session) -> dict[str, int]:
    """Add stable demo translators, order items, invitations and delivery records."""
    counts = {"translators": 0, "orders": 0, "items": 0, "invites": 0, "files": 0, "deliveries": 0}

    translator_ids = []
    for seed in SEED_TRANSLATORS:
        existing = db.query(Translator).filter(Translator.email == seed.email).first()
        if existing is None:
            existing = Translator(id=seed.id, name=seed.name, email=seed.email, phone=seed.phone)
            db.add(existing)
            db.flush()
            counts["translators"] += 1
        translator_ids.append(existing.id)

    quote = (
        db.query(Quote)
        .options(selectinload(Quote.items))
        .filter(Quote.id == SEED_DEMO_QUOTE_ID)
        .first()
    )
    if quote is None or quote.status != "approved" or not quote.items:
        return counts
    order = db.query(ServiceOrder).filter(ServiceOrder.id == SEED_DEMO_ORDER_ID).first()
    if order is None:
        order = ServiceOrder(
            id=SEED_DEMO_ORDER_ID,
            quote_id=quote.id,
            company_id=quote.company_id,
            project_name="Projeto de tradução corporativa",
            deadline=datetime.now(UTC) + timedelta(days=14),
        )
        db.add(order)
        db.flush()
        counts["orders"] += 1

    items = db.query(ServiceOrderItem).filter(ServiceOrderItem.service_order_id == order.id).all()
    for source in quote.items:
        item = next((row for row in items if row.quote_translation_item_id == source.id), None)
        if item is None:
            item = ServiceOrderItem(
                id=_id(f"item:{order.id}:{source.id}"),
                service_order_id=order.id,
                quote_translation_item_id=source.id,
                source_language=source.source_language,
                target_language=source.target_language,
                document_type=source.document_type,
                file_url=source.file_url,
                price=source.estimated_value,
                status="pendente",
                deadline=order.deadline,
            )
            db.add(item)
            db.flush()
            items.append(item)
            counts["items"] += 1

    if not items:
        return counts
    item = items[0]
    status_variants = ["em_andamento", "em_analise", "concluida", "pendente"]
    for index, row in enumerate(items):
        if index < len(status_variants):
            row.status = status_variants[index]
            row.translator_id = translator_ids[index % len(translator_ids)]
            if row.status == "concluida":
                row.completed_at = datetime.now(UTC) - timedelta(days=2)
    for index, translator_id in enumerate(translator_ids):
        exists = (
            db.query(ServiceOrderItemInvite)
            .filter_by(service_order_item_id=item.id, translator_id=translator_id)
            .first()
        )
        if exists is None:
            db.add(
                ServiceOrderItemInvite(
                    id=_id(f"invite:{item.id}:{translator_id}"),
                    service_order_item_id=item.id,
                    translator_id=translator_id,
                    status="aceito" if index == 0 else "pendente",
                )
            )
            if index == 0:
                item.translator_id = translator_id
                item.status = "em_andamento"
            counts["invites"] += 1

    file_id = _id(f"file:{order.id}:entrega-revisada")
    document = db.get(ServiceOrderFile, file_id)
    if document is None:
        document = ServiceOrderFile(
            id=file_id,
            service_order_id=order.id,
            service_order_item_id=item.id,
            filename="traducao-revisada.pdf",
            file_url="https://example.com/documentos/traducao-revisada.pdf",
            content_type="application/pdf",
            direction="saida",
            delivery_status="sent",
            review_status="approved",
            review_note="Documento revisado para apresentação.",
        )
        db.add(document)
        db.flush()
        counts["files"] += 1
    if db.query(ServiceOrderDelivery).filter_by(document_file_id=file_id).first() is None:
        db.add(
            ServiceOrderDelivery(
                id=_id(f"delivery:{file_id}"),
                service_order_id=order.id,
                document_file_id=file_id,
                status="sent",
                sent_at=datetime.now(UTC),
            )
        )
        counts["deliveries"] += 1
    for index, row in enumerate(items[1:], start=1):
        extra_id = _id(f"file:{order.id}:arquivo-{index}")
        if db.get(ServiceOrderFile, extra_id) is None:
            db.add(
                ServiceOrderFile(
                    id=extra_id,
                    service_order_id=order.id,
                    service_order_item_id=row.id,
                    filename=f"traducao-item-{index}.pdf",
                    file_url=f"https://example.com/documentos/traducao-item-{index}.pdf",
                    content_type="application/pdf",
                    direction="saida",
                    delivery_status="pending",
                    review_status="pending",
                )
            )
            counts["files"] += 1
    db.commit()
    return counts
