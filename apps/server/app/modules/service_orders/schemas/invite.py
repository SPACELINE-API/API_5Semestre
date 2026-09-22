import uuid
from datetime import datetime

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
