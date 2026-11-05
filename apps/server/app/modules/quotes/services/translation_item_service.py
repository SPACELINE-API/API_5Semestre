import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemUpdate,
)
from app.modules.quotes.services.quote_lock import ensure_quote_is_editable


class TranslationItemService:
    def __init__(self, db: Session):
        self.db = db

    def _get_quote(self, quote_id: uuid.UUID) -> Quote:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        return quote

    def create_item(
        self, quote_id: uuid.UUID, item_data: QuoteTranslationItemCreate
    ) -> QuoteTranslationItem:
        quote = self._get_quote(quote_id)
        ensure_quote_is_editable(quote)

        item = QuoteTranslationItem(
            quote_id=quote_id,
            source_language=item_data.source_language,
            target_language=item_data.target_language,
            document_type=item_data.document_type,
            file_url=item_data.file_url,
            estimated_value=item_data.estimated_value,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_items(self, quote_id: uuid.UUID) -> list[QuoteTranslationItem]:
        self._get_quote(quote_id)

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
        ensure_quote_is_editable(self._get_quote(quote_id))
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

        for field, value in item_data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_item(self, quote_id: uuid.UUID, item_id: uuid.UUID) -> None:
        ensure_quote_is_editable(self._get_quote(quote_id))
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

        self.db.delete(item)
        self.db.commit()
