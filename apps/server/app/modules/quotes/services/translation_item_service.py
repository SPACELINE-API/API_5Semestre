import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.schemas.translation_item import QuoteTranslationItemCreate
from app.modules.translators.models.language_pair import LanguagePair


class TranslationItemService:
    def __init__(self, db: Session):
        self.db = db

    def create_item(self, quote_id: uuid.UUID, item_data: QuoteTranslationItemCreate) -> QuoteTranslationItem:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")

        item = QuoteTranslationItem(
            quote_id=quote_id,
            source_language=item_data.source_language,
            target_language=item_data.target_language
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_items(self, quote_id: uuid.UUID) -> list[QuoteTranslationItem]:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")

        return self.db.query(QuoteTranslationItem).filter(QuoteTranslationItem.quote_id == quote_id).all()
