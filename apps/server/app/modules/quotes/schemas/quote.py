import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class QuoteCreate(BaseModel):
    status: str = Field(default="draft")


class QuoteResponse(BaseModel):
    id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuoteFromRequestResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    status: str
    customer_name: str
    enterprise: str
    email: str
    original_language: str
    translation_language: str
    customer_need: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
