import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.shared.database import get_db
from app.modules.quotes.schemas.translation_item import QuoteTranslationItemCreate, QuoteTranslationItemResponse
from app.modules.quotes.schemas.quote import QuoteCreate, QuoteResponse
from app.modules.quotes.services.translation_item_service import TranslationItemService
from app.modules.quotes.services.quote_service import QuoteService

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("", response_model=QuoteResponse, status_code=201)
def create_quote(
    quote_data: QuoteCreate,
    db: Session = Depends(get_db)
):
    service = QuoteService(db)
    return service.create_quote(quote_data)


@router.post("/{quote_id}/translation-items", response_model=QuoteTranslationItemResponse, status_code=201)
def create_translation_item(
    quote_id: uuid.UUID,
    item_data: QuoteTranslationItemCreate,
    db: Session = Depends(get_db)
):
    service = TranslationItemService(db)
    return service.create_item(quote_id, item_data)


@router.get("/{quote_id}/translation-items", response_model=list[QuoteTranslationItemResponse])
def list_translation_items(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    service = TranslationItemService(db)
    return service.list_items(quote_id)
