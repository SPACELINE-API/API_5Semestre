import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_CNPJ_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_CNPJ_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def normalize_cnpj(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", value).upper()


def calculate_cnpj_check_digit(base: str, weights: list[int]) -> str:
    total = sum((ord(char) - 48) * weight for char, weight in zip(base, weights, strict=True))
    remainder = total % 11

    return "0" if remainder < 2 else str(11 - remainder)


def is_valid_cnpj(value: str) -> bool:
    normalized = normalize_cnpj(value)

    if not re.fullmatch(r"[0-9A-Z]{12}[0-9]{2}", normalized):
        return False

    base = normalized[:12]
    first_dv = calculate_cnpj_check_digit(base, _CNPJ_FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _CNPJ_SECOND_DV_WEIGHTS)

    return normalized[12:] == first_dv + second_dv


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

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, value: str) -> str:
        if not is_valid_cnpj(value):
            raise ValueError("CNPJ invalido")

        return normalize_cnpj(value)


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

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, value: str | None) -> str | None:
        if value is None:
            return value

        if not is_valid_cnpj(value):
            raise ValueError("CNPJ invalido")

        return normalize_cnpj(value)


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

    model_config = ConfigDict(from_attributes=True)
