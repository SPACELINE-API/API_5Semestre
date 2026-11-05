from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from app.modules.quotes.models.quote import Quote

if TYPE_CHECKING:
    from app.modules.service_orders.models.service_order import ServiceOrder

APPROVED_QUOTE_LOCKED_MESSAGE = (
    "Não é possível alterar este registro após a aprovação do orçamento."
)


def ensure_quote_is_editable(quote: Quote) -> None:
    if quote.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=APPROVED_QUOTE_LOCKED_MESSAGE,
        )


def ensure_service_order_items_are_editable(service_order: "ServiceOrder") -> None:
    if service_order.quote is not None:
        ensure_quote_is_editable(service_order.quote)
