import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.modules.quotes.models.request import StatusEnum


class RequestCreate(BaseModel):
    customer_name: str = Field(..., max_length=255)
    enterprise: str = Field(..., max_length=155)
    email: str = Field(..., max_length=155, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    original_language: str = Field(..., max_length=50)
    translation_language: str = Field(..., max_length=50)
    customer_need: str = Field(..., max_length=100)


class RequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_name: str
    enterprise: str
    email: str
    original_language: str
    translation_language: str
    customer_need: str
    status: StatusEnum
    request_date: date
