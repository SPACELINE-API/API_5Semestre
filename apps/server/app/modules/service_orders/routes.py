import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.service_orders.schemas.invite import (
    SendInvitesRequest,
    ServiceOrderItemInviteResponse,
)
from app.modules.service_orders.schemas.service_order import (
    CreateServiceOrderItemRequest,
    GenerateServiceOrderRequest,
    ServiceOrderFileResponse,
    ServiceOrderItemResponse,
    ServiceOrderResponse,
    UpdateServiceOrderItemRequest,
    UpdateServiceOrderRequest,
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


@router.patch("/{service_order_id}", response_model=ServiceOrderResponse)
def update_service_order(
    service_order_id: uuid.UUID,
    data: UpdateServiceOrderRequest,
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    return service.update_service_order(service_order_id, data)


@router.post(
    "/{service_order_id}/files",
    response_model=ServiceOrderFileResponse,
    status_code=201,
)
def add_service_order_file(
    service_order_id: uuid.UUID,
    direction: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    content_type = file.content_type or "application/octet-stream"
    return service.add_file(
        service_order_id,
        filename=file.filename or "arquivo",
        file_data=file.file,
        content_type=content_type,
        direction=direction,
    )


@router.post(
    "/{service_order_id}/items",
    response_model=ServiceOrderItemResponse,
    status_code=201,
)
def add_service_order_item(
    service_order_id: uuid.UUID,
    source_language: str = Form(...),
    target_language: str = Form(...),
    document_type: str | None = Form(None),
    word_count: int | None = Form(None),
    price: Decimal | None = Form(None),
    deadline: datetime | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    data = CreateServiceOrderItemRequest(
        source_language=source_language,
        target_language=target_language,
        document_type=document_type,
        word_count=word_count,
        price=price,
        deadline=deadline,
    )
    return service.add_item(
        service_order_id,
        data,
        filename=file.filename if file else None,
        file_data=file.file if file else None,
        content_type=(file.content_type or "application/octet-stream") if file else None,
    )


@router.patch(
    "/items/{item_id}",
    response_model=ServiceOrderItemResponse,
)
def update_service_order_item(
    item_id: uuid.UUID,
    source_language: str | None = Form(None),
    target_language: str | None = Form(None),
    document_type: str | None = Form(None),
    word_count: int | None = Form(None),
    price: Decimal | None = Form(None),
    deadline: datetime | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    service = ServiceOrderService(db)
    data = UpdateServiceOrderItemRequest(
        source_language=source_language,
        target_language=target_language,
        document_type=document_type,
        word_count=word_count,
        price=price,
        deadline=deadline,
    )
    return service.update_item(
        item_id,
        data,
        filename=file.filename if file else None,
        file_data=file.file if file else None,
        content_type=(file.content_type or "application/octet-stream") if file else None,
    )


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


@router.get("/items/{item_id}/invites", response_model=list[ServiceOrderItemInviteResponse])
def list_invites_for_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service = InviteService(db)
    return service.list_invites_for_item(item_id)


@router.get("/invites/me", response_model=list[ServiceOrderItemInviteResponse])
def list_my_invites(
    db: Session = Depends(get_db),
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
):
    service = InviteService(db)
    return service.list_invites_for_translator_email(current_user.email)


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
