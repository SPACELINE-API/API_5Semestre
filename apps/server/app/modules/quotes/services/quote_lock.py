from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from app.modules.quotes.models.quote import (
    QUOTE_STATUS_APPROVED,
    QUOTE_STATUS_CANCELLED,
    QUOTE_STATUS_DRAFT,
    QUOTE_STATUS_PENDING,
    QUOTE_STATUS_REPROVED,
    Quote,
)

if TYPE_CHECKING:
    from app.modules.service_orders.models.service_order import ServiceOrder

EDITABLE_STATUS_HINT = "O orçamento precisa estar em preparação para ser alterado."

QUOTE_LOCK_REASONS = {
    QUOTE_STATUS_PENDING: "Este orçamento está aguardando aprovação do cliente.",
    QUOTE_STATUS_APPROVED: "Este orçamento já foi aprovado.",
    QUOTE_STATUS_REPROVED: "Este orçamento foi reprovado.",
    QUOTE_STATUS_CANCELLED: "Este orçamento foi cancelado.",
}

SERVICE_ORDER_ITEMS_LOCKED_MESSAGE = (
    "Os itens desta ordem de serviço vêm do orçamento vinculado e não podem ser alterados "
    "por aqui. Reabra o orçamento para alterar os itens."
)


def quote_locked_message(quote_status: str) -> str:
    reason = QUOTE_LOCK_REASONS.get(quote_status, "Este orçamento não pode ser alterado.")
    return f"{reason} {EDITABLE_STATUS_HINT}"


def ensure_quote_is_editable(quote: Quote) -> None:
    if quote.status != QUOTE_STATUS_DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=quote_locked_message(quote.status),
        )


def ensure_service_order_items_are_editable(service_order: "ServiceOrder") -> None:
    if service_order.quote_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=SERVICE_ORDER_ITEMS_LOCKED_MESSAGE,
        )
