import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.notifications.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.modules.notifications.services.notification_service import NotificationService
from app.shared.database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    event_type: str | None = Query(default=None, min_length=1, max_length=80),
    is_read: bool | None = Query(default=None, alias="read"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).list_for_user(
        uuid.UUID(current_user.id),
        event_type=event_type,
        is_read=is_read,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UnreadCountResponse(
        count=NotificationService(db).unread_count(uuid.UUID(current_user.id))
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService(db).mark_read(notification_id, uuid.UUID(current_user.id))
