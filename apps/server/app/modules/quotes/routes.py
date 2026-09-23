import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.modules.quotes.schemas.quote import QuoteCreate, QuoteResponse
from app.modules.quotes.schemas.request import RequestCreate, RequestResponse
from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemResponse,
)
from app.modules.quotes.services.quote_service import QuoteService
from app.modules.quotes.services.request_service import RequestService
from app.modules.quotes.services.storage import upload_quote_document
from app.modules.quotes.services.translation_item_service import TranslationItemService
from app.shared.database import get_db

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("/upload-document", status_code=201)
def upload_document(file: UploadFile = File(...)):
    content_type = file.content_type or "application/octet-stream"
    file_url = upload_quote_document(
        filename=file.filename or "uploaded_file",
        file_data=file.file,
        content_type=content_type,
    )

    return {"file_url": file_url}


@router.post("", response_model=QuoteResponse, status_code=201)
def create_quote(
    quote_data: QuoteCreate,
    db: Session = Depends(get_db),
):
    service = QuoteService(db)
    return service.create_quote(quote_data)


@router.post(
    "/{quote_id}/translation-items", response_model=QuoteTranslationItemResponse, status_code=201
)
def create_translation_item(
    quote_id: uuid.UUID,
    item_data: QuoteTranslationItemCreate,
    db: Session = Depends(get_db),
):
    service = TranslationItemService(db)
    return service.create_item(quote_id, item_data)


@router.get("/{quote_id}/translation-items", response_model=list[QuoteTranslationItemResponse])
def list_translation_items(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service = TranslationItemService(db)
    return service.list_items(quote_id)


@router.post("/requests", response_model=RequestResponse, status_code=201)
async def create_request(
    customer_name: str = Form(..., max_length=255),
    enterprise: str = Form(..., max_length=155),
    email: str = Form(..., max_length=155),
    original_language: str = Form(..., max_length=50),
    translation_language: str = Form(..., max_length=50),
    customer_need: str = Form(..., max_length=100),
    document: UploadFile | None = File(None),
    db: Session = Depends(get_db),  # noqa: B008
):
    document_bytes = await document.read() if document else None
    request_data = RequestCreate(
        customer_name=customer_name,
        enterprise=enterprise,
        email=email,
        original_language=original_language,
        translation_language=translation_language,
        customer_need=customer_need,
        document=document_bytes,
    )
    service = RequestService(db)
    return service.create(request_data)


@router.get("/requests", response_model=list[RequestResponse])
def list_requests(
    db: Session = Depends(get_db),  # noqa: B008
):
    service = RequestService(db)
    return service.list_all()
