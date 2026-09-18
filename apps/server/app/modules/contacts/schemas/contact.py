import re
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class ContactBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    department: str
    company_id: uuid.UUID

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        pattern = r"^\(\d{2}\) \d{5}-\d{4}$"
        if not re.match(pattern, v):
            raise ValueError("O telefone deve seguir o formato definido pelo sistema.")
        return v


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    department: str | None = None
    company_id: uuid.UUID | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        pattern = r"^\(\d{2}\) \d{5}-\d{4}$"
        if not re.match(pattern, v):
            raise ValueError("O telefone deve seguir o formato definido pelo sistema.")
        return v


class ContactResponse(ContactBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateContactResponse(BaseModel):
    message: str
    contact: ContactResponse
