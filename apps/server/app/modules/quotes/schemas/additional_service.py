import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class AdditionalServiceCreate(BaseModel):
    quote_id: uuid.UUID | None = None
    service_order_id: uuid.UUID | None = None
    description: str = Field(max_length=255)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A descrição não pode ser vazia")
        return value

    @model_validator(mode="after")
    def validate_target(self) -> "AdditionalServiceCreate":
        if (self.quote_id is None) == (self.service_order_id is None):
            raise ValueError("Informe apenas um entre quote_id e service_order_id")
        return self

class AdditionalServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quote_id: uuid.UUID
    service_order_id: uuid.UUID | None
    created_by: uuid.UUID | None
    description: str
    price: Decimal
    status: str
    created_at: datetime
    updated_at: datetime