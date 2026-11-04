import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class QuoteReceiptStatus(StrEnum):
    AVAILABLE = "available"
    SENT = "sent"
    ERROR = "error"


class QuoteReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quote_id: uuid.UUID
    company_id: uuid.UUID
    status: str
    pdf_url: str | None = None
    sent_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
