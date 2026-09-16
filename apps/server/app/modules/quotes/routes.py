import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.quotes.schemas.quote import QuoteCreate, QuoteResponse
from app.modules.quotes.schemas.request import RequestCreate, RequestResponse
from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemResponse,
)
from app.modules.quotes.services.quote_service import QuoteService
from app.modules.quotes.services.request_service import RequestService
from app.modules.quotes.services.translation_item_service import TranslationItemService
from app.shared.database import get_db

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("", response_model=QuoteResponse, status_code=201)
def create_quote(
    quote_data: QuoteCreate,
    db: Session = Depends(get_db),  # noqa: B008
):
    service = QuoteService(db)
    return service.create_quote(quote_data)


@router.post(
    "/{quote_id}/translation-items", response_model=QuoteTranslationItemResponse, status_code=201
)
def create_translation_item(
    quote_id: uuid.UUID,
    item_data: QuoteTranslationItemCreate,
    db: Session = Depends(get_db),  # noqa: B008
):
    service = TranslationItemService(db)
    return service.create_item(quote_id, item_data)


@router.get("/{quote_id}/translation-items", response_model=list[QuoteTranslationItemResponse])
def list_translation_items(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db),  # noqa: B008
):
    service = TranslationItemService(db)
    return service.list_items(quote_id)

@router.post("/requests", response_model=RequestResponse, status_code=201)
def create_request(
    request_data: RequestCreate,
    db: Session = Depends(get_db), # noqa: B008
):
    service = RequestService(db)
    return service.create(request_data)


@router.get("/requests", response_model=list[RequestResponse])
def list_requests(
    db: Session = Depends(get_db), # noqa: B008
):
    service = RequestService(db)
    return service.list_all()
