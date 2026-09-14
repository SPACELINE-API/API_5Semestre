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
