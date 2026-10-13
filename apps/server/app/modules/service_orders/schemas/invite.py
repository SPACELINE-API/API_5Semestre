import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SendInvitesRequest(BaseModel):
    translator_ids: list[uuid.UUID] = Field(min_length=1)


class ServiceOrderItemInviteResponse(BaseModel):
    id: uuid.UUID
    service_order_item_id: uuid.UUID
    translator_id: uuid.UUID
    status: str
    sent_at: datetime
    responded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class InviteItemSummary(BaseModel):
    id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str | None
    deadline: datetime | None
    status: str

    model_config = ConfigDict(from_attributes=True)


class InviteItemDetails(InviteItemSummary):
    file_url: str | None
    word_count: int | None
    price: Decimal | None


class TranslatorInviteResponse(ServiceOrderItemInviteResponse):
    item: InviteItemSummary = Field(validation_alias="service_order_item")


class TranslatorInviteDetailsResponse(ServiceOrderItemInviteResponse):
    item: InviteItemDetails = Field(validation_alias="service_order_item")
