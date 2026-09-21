import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.service_orders.schemas.invite import (
    SendInvitesRequest,
    ServiceOrderItemInviteResponse,
)
from app.modules.service_orders.schemas.service_order import (
    GenerateServiceOrderRequest,
    ServiceOrderResponse,
)
from app.modules.service_orders.services.invite_service import InviteService
from app.modules.service_orders.services.service_order_service import ServiceOrderService
from app.shared.database import get_db

router = APIRouter(prefix="/service-orders", tags=["service-orders"])


@router.post("/generate-from-quote", response_model=ServiceOrderResponse, status_code=201)
def generate_from_quote(
    data: GenerateServiceOrderRequest,
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    return service.generate_from_quote(data)


@router.get("", response_model=list[ServiceOrderResponse])
def list_service_orders(
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    return service.list_service_orders()


@router.get("/{service_order_id}", response_model=ServiceOrderResponse)
def get_service_order(
    service_order_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    return service.get_service_order(service_order_id)


@router.post(
    "/items/{item_id}/invites",
    response_model=list[ServiceOrderItemInviteResponse],
    status_code=201,
)
def send_invites(
    item_id: uuid.UUID,
    data: SendInvitesRequest,
    db: Session = Depends(get_db),
):
    service = InviteService(db)
    return service.send_invites(item_id, data.translator_ids)


@router.post("/invites/{invite_id}/accept", response_model=ServiceOrderItemInviteResponse)
def accept_invite(
    invite_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
):
    service = InviteService(db)
    return service.accept_invite(invite_id, current_user.email)


@router.post("/invites/{invite_id}/decline", response_model=ServiceOrderItemInviteResponse)
def decline_invite(
    invite_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
):
    service = InviteService(db)
    return service.decline_invite(invite_id, current_user.email)
