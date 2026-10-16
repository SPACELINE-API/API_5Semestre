from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session, selectinload

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum

_SORTABLE_FIELDS: dict[str, InstrumentedAttribute[Any]] = {
    "created_at": Quote.created_at,
    "status": Quote.status,
    "customer_name": Quote.customer_name,
    "enterprise": Quote.enterprise,
}
_DEFAULT_ORDER_BY = ("created_at", "desc")


class ProposalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_proposals(
        self,
        *,
        page: int,
        page_size: int,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | None = None,
        order_by: str = _DEFAULT_ORDER_BY[0],
        order_dir: str = _DEFAULT_ORDER_BY[1],
    ) -> dict:
        if start_date is not None and end_date is not None and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date não pode ser posterior a end_date.",
            )

        if order_by not in _SORTABLE_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Campo de ordenação '{order_by}' inválido. "
                    f"Valores permitidos: {sorted(_SORTABLE_FIELDS)}."
                ),
            )

        if order_dir not in ("asc", "desc"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="order_dir deve ser 'asc' ou 'desc'.",
            )

        base = (
            select(Quote)
            .join(Request, Quote.request_id == Request.id)
            .where(Request.status == StatusEnum.APPROVED)
            .options(selectinload(Quote.items))
        )

        if status_filter:
            base = base.where(Quote.status == status_filter)

        if start_date is not None:
            base = base.where(func.date(Quote.created_at) >= start_date)

        if end_date is not None:
            base = base.where(func.date(Quote.created_at) <= end_date)

        total: int = self.db.scalar(select(func.count()).select_from(base.subquery())) or 0

        sort_col = _SORTABLE_FIELDS[order_by]
        direction = desc if order_dir == "desc" else asc
        ordered = base.order_by(direction(sort_col), asc(Quote.id))

        quotes = list(self.db.scalars(ordered.offset((page - 1) * page_size).limit(page_size)))

        items = [self._to_item(q) for q in quotes]
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    def _build_translation_service(quote: Quote) -> str | None:
        if quote.original_language and quote.translation_language:
            return f"{quote.original_language} → {quote.translation_language}"
        return None

    @staticmethod
    def _to_item(quote: Quote) -> dict:
        return {
            "id": quote.id,
            "customer_name": quote.customer_name,
            "enterprise": quote.enterprise,
            "translation_service": ProposalService._build_translation_service(quote),
            "total_value": quote.total_value,
            "status": quote.status,
            "created_at": quote.created_at,
        }
