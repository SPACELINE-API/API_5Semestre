from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.quote_audit_log import QUOTE_AUDIT_ACTION_REOPEN, QuoteAuditLog
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import (
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.models.service_order_version import (
    VERSION_ORIGIN_QUOTE_APPROVAL,
    VERSION_ORIGIN_QUOTE_REAPPROVAL,
    ServiceOrderVersion,
)

SYNCED_FIELDS = {
    "source_language": "source_language",
    "target_language": "target_language",
    "document_type": "document_type",
    "file_url": "file_url",
    "price": "estimated_value",
}

ITEM_IN_PROGRESS_MESSAGE = (
    "Este documento já está em andamento na ordem de serviço (tradutor atribuído ou entrega "
    "registrada) e não pode ser removido do orçamento."
)


def _serialize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return f"{value:.2f}"
    return value


def _item_label(item: ServiceOrderItem | QuoteTranslationItem) -> str:
    document = item.document_type or "Documento"
    return f"{document} ({item.source_language} → {item.target_language})"


def is_item_in_progress(db: Session, item: ServiceOrderItem) -> bool:
    if item.translator_id is not None or item.status != STATUS_PENDENTE:
        return True
    return (
        db.query(ServiceOrderFile.id)
        .filter(ServiceOrderFile.service_order_item_id == item.id)
        .first()
        is not None
    )


def detach_quote_item_from_service_order(db: Session, quote_item: QuoteTranslationItem) -> None:
    linked_items = (
        db.query(ServiceOrderItem)
        .filter(ServiceOrderItem.quote_translation_item_id == quote_item.id)
        .all()
    )
    for item in linked_items:
        if is_item_in_progress(db, item):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=ITEM_IN_PROGRESS_MESSAGE
            )
    removed_at = datetime.now(UTC)
    for item in linked_items:
        item.quote_translation_item_id = None
        item.removed_from_quote_at = removed_at


def next_version_number(db: Session, service_order: ServiceOrder) -> int:
    current = (
        db.query(ServiceOrderVersion.version)
        .filter(ServiceOrderVersion.service_order_id == service_order.id)
        .order_by(ServiceOrderVersion.version.desc())
        .first()
    )
    return (current[0] if current else 0) + 1


def record_initial_version(
    db: Session, service_order: ServiceOrder, actor_email: str | None
) -> ServiceOrderVersion:
    version = ServiceOrderVersion(
        service_order_id=service_order.id,
        version=1,
        origin=VERSION_ORIGIN_QUOTE_APPROVAL,
        reason=None,
        changes=[
            {"action": "added", "item": _item_label(item), "fields": {}}
            for item in service_order.items
        ],
        actor_email=actor_email,
    )
    db.add(version)
    return version


def _last_reopen_reason(db: Session, quote: Quote) -> str | None:
    audit = (
        db.query(QuoteAuditLog)
        .filter(
            QuoteAuditLog.quote_id == quote.id,
            QuoteAuditLog.action == QUOTE_AUDIT_ACTION_REOPEN,
        )
        .order_by(QuoteAuditLog.created_at.desc())
        .first()
    )
    return audit.reason if audit else None


def sync_service_order_with_quote(
    db: Session,
    quote: Quote,
    service_order: ServiceOrder,
    actor_email: str | None,
) -> ServiceOrderVersion:
    changes: list[dict[str, Any]] = []
    linked = {
        item.quote_translation_item_id: item
        for item in service_order.items
        if item.quote_translation_item_id is not None
    }

    for quote_item in quote.items:
        os_item = linked.get(quote_item.id)
        if os_item is None:
            new_item = ServiceOrderItem(
                quote_translation_item_id=quote_item.id,
                source_language=quote_item.source_language,
                target_language=quote_item.target_language,
                document_type=quote_item.document_type,
                file_url=quote_item.file_url,
                price=quote_item.estimated_value,
            )
            service_order.items.append(new_item)
            changes.append({"action": "added", "item": _item_label(quote_item), "fields": {}})
            continue

        field_changes = {}
        for os_field, quote_field in SYNCED_FIELDS.items():
            before = getattr(os_item, os_field)
            after = getattr(quote_item, quote_field)
            if _serialize(before) != _serialize(after):
                field_changes[os_field] = {"before": _serialize(before), "after": _serialize(after)}
                setattr(os_item, os_field, after)
        if field_changes:
            changes.append(
                {"action": "updated", "item": _item_label(os_item), "fields": field_changes}
            )

    for os_item in list(service_order.items):
        if os_item.removed_from_quote_at is not None:
            changes.append({"action": "removed", "item": _item_label(os_item), "fields": {}})
            service_order.items.remove(os_item)

    version = ServiceOrderVersion(
        service_order_id=service_order.id,
        version=next_version_number(db, service_order),
        origin=VERSION_ORIGIN_QUOTE_REAPPROVAL,
        reason=_last_reopen_reason(db, quote),
        changes=changes,
        actor_email=actor_email,
    )
    db.add(version)
    return version
