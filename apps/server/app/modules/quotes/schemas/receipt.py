import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.modules.quotes.models.quote import Quote


class QuoteReceiptStatus(StrEnum):
    AVAILABLE = "available"
    SENT = "sent"
    ERROR = "error"


class QuoteReceiptResponse(BaseModel):
    quote_id: uuid.UUID
    company_id: uuid.UUID | None = None
    status: QuoteReceiptStatus
    pdf_url: str | None = None
    generated_at: datetime | None = None
    sent_at: datetime | None = None
    error_message: str | None = None

    @classmethod
    def from_quote(cls, quote: Quote) -> "QuoteReceiptResponse":
        if quote.receipt_status is None:
            raise ValueError("Orçamento sem comprovante gerado.")
        return cls(
            quote_id=quote.id,
            company_id=quote.company_id,
            status=QuoteReceiptStatus(quote.receipt_status),
            pdf_url=quote.receipt_pdf_url,
            generated_at=quote.receipt_generated_at,
            sent_at=quote.receipt_sent_at,
            error_message=quote.receipt_error_message,
        )


class QuoteReceiptDownloadResponse(BaseModel):
    download_url: str
