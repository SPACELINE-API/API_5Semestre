import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class QuoteTranslationItemCreate(BaseModel):
    source_language: str = Field(..., min_length=2, max_length=10)
    target_language: str = Field(..., min_length=2, max_length=10)


class QuoteTranslationItemResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    source_language: str
    target_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
