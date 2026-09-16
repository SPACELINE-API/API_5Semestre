import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CompanyCreate(BaseModel):
    legal_name: str = Field(min_length=1, max_length=150)
    trade_name: str = Field(min_length=1, max_length=150)
    cnpj: str = Field(min_length=1, max_length=18)
    industry: str = Field(min_length=1, max_length=100)

    phone: str = Field(min_length=1, max_length=30)
    email: str = Field(min_length=1, max_length=255)

    zip_code: str = Field(min_length=1, max_length=10)
    street: str = Field(min_length=1, max_length=150)
    number: str = Field(min_length=1, max_length=10)
    complement: str | None = Field(default=None, max_length=100)
    neighborhood: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=2, max_length=2)


class CompanyUpdate(BaseModel):
    legal_name: str | None = Field(default=None, min_length=1, max_length=150)
    trade_name: str | None = Field(default=None, min_length=1, max_length=150)
    cnpj: str | None = Field(default=None, min_length=1, max_length=18)
    is_active: bool | None = None
    industry: str | None = Field(default=None, min_length=1, max_length=100)

    phone: str | None = Field(default=None, min_length=1, max_length=30)
    email: str | None = Field(default=None, min_length=1, max_length=255)

    zip_code: str | None = Field(default=None, min_length=1, max_length=10)
    street: str | None = Field(default=None, min_length=1, max_length=150)
    number: str | None = Field(default=None, min_length=1, max_length=10)
    complement: str | None = Field(default=None, max_length=100)
    neighborhood: str | None = Field(default=None, min_length=1, max_length=100)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    state: str | None = Field(default=None, min_length=2, max_length=2)


class CompanyResponse(BaseModel):
    id: uuid.UUID
    legal_name: str
    trade_name: str
    cnpj: str
    is_active: bool
    industry: str

    phone: str
    email: str

    zip_code: str
    street: str
    number: str
    complement: str | None
    neighborhood: str
    city: str
    state: str

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
