import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProposalItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_name: str | None
    enterprise: str | None
    translation_service: str | None
    total_value: Decimal
    status: str
    created_at: datetime


class ProposalListResponse(BaseModel):
    items: list[ProposalItemResponse]
    total: int
    page: int
    page_size: int
