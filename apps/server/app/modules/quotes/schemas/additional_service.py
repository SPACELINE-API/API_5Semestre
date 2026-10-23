import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AdditionalServiceCreate(BaseModel):
    quote_id: uuid.UUID
    description: str = Field(max_length=255)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A descrição não pode ser vazia")
        return value


class AdditionalServiceUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("A descrição não pode ser vazia")
        return value

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: Decimal | None) -> Decimal:
        if value is None:
            raise ValueError("O valor não pode ser vazio")
        return value

    @model_validator(mode="after")
    def validate_fields(self) -> "AdditionalServiceUpdate":
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualizar")
        return self


class AdditionalServiceStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|approved|reproved)$")


class AdditionalServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quote_id: uuid.UUID
    created_by: uuid.UUID | None
    description: str
    price: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
