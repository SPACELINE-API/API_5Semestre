import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.quote_receipts.schemas.quote_receipt import QuoteReceiptResponse
from app.modules.quote_receipts.services.quote_receipt_service import (
    QuoteReceiptNotFoundError,
    QuoteReceiptService,
)
from app.shared.database import get_db

router = APIRouter(prefix="/quotes", tags=["quote-receipts"])
quotes_read_permission = require_permission("quotes.read")


@router.get("/{quote_id}/receipt", response_model=QuoteReceiptResponse)
def get_quote_receipt(
    quote_id: uuid.UUID,
    _user=Depends(quotes_read_permission),
    db: Session = Depends(get_db),
):
    service = QuoteReceiptService(db)
    try:
        return service.get_by_quote_id(quote_id)
    except QuoteReceiptNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{quote_id}/receipt/download")
def download_quote_receipt(
    quote_id: uuid.UUID,
    _user=Depends(quotes_read_permission),
    db: Session = Depends(get_db),
):
    service = QuoteReceiptService(db)
    try:
        receipt = service.get_by_quote_id(quote_id)
        if not receipt.pdf_url:
            raise HTTPException(status_code=404, detail="PDF não disponível para este comprovante.")
        return {"download_url": receipt.pdf_url}
    except QuoteReceiptNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
