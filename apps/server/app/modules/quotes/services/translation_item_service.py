import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemUpdate,
)
from app.modules.quotes.services.quote_lock import ensure_quote_is_editable
from app.modules.quotes.services.receipt_formatting import SAO_PAULO_TIMEZONE
from app.modules.service_orders.services.quote_sync_service import (
    detach_quote_item_from_service_order,
)

DEADLINE_IN_PAST_MESSAGE = "O prazo não pode ser anterior à data de hoje."


def _ensure_deadline_not_in_past(new: datetime | None, current: datetime | None = None) -> None:
    if new is None or new == current:
        return
    if new.date() < datetime.now(SAO_PAULO_TIMEZONE).date():
        raise HTTPException(status_code=422, detail=DEADLINE_IN_PAST_MESSAGE)


class TranslationItemService:
    def __init__(self, db: Session):
        self.db = db

    def create_item(
        self, quote_id: uuid.UUID, item_data: QuoteTranslationItemCreate
    ) -> QuoteTranslationItem:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        ensure_quote_is_editable(quote)
        _ensure_deadline_not_in_past(item_data.deadline)

        item = QuoteTranslationItem(
            quote_id=quote_id,
            source_language=item_data.source_language,
            target_language=item_data.target_language,
            document_type=item_data.document_type,
            file_url=item_data.file_url,
            word_count=item_data.word_count,
            estimated_value=item_data.estimated_value,
            deadline=item_data.deadline,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_items(self, quote_id: uuid.UUID) -> list[QuoteTranslationItem]:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")

        return (
            self.db.query(QuoteTranslationItem)
            .filter(QuoteTranslationItem.quote_id == quote_id)
            .all()
        )

    def update_item(
        self,
        quote_id: uuid.UUID,
        item_id: uuid.UUID,
        item_data: QuoteTranslationItemUpdate,
    ) -> QuoteTranslationItem:
        item = (
            self.db.query(QuoteTranslationItem)
            .filter(
                QuoteTranslationItem.id == item_id,
                QuoteTranslationItem.quote_id == quote_id,
            )
            .first()
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Item do orçamento não encontrado.")
        ensure_quote_is_editable(item.quote)
        changes = item_data.model_dump(exclude_unset=True)
        if "deadline" in changes:
            _ensure_deadline_not_in_past(changes["deadline"], item.deadline)

        for field, value in changes.items():
            setattr(item, field, value)

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_item(self, quote_id: uuid.UUID, item_id: uuid.UUID) -> None:
        item = (
            self.db.query(QuoteTranslationItem)
            .filter(
                QuoteTranslationItem.id == item_id,
                QuoteTranslationItem.quote_id == quote_id,
            )
            .first()
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Item do orçamento não encontrado.")
        ensure_quote_is_editable(item.quote)
        detach_quote_item_from_service_order(self.db, item)

        self.db.delete(item)
        self.db.commit()
