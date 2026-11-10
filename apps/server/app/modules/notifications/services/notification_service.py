import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User
from app.modules.auth.services.roles_service import has_permission
from app.modules.notifications.models.notification import Notification
from app.modules.notifications.repositories.notification_repository import NotificationRepository
from app.modules.notifications.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
)
from app.modules.translators.models.translator import Translator


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = NotificationRepository(db)

    def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        event_type: str | None,
        is_read: bool | None,
        page: int,
        page_size: int,
    ) -> NotificationListResponse:
        items, total = self.repository.list_for_user(
            user_id,
            event_type=event_type,
            is_read=is_read,
            page=page,
            page_size=page_size,
        )
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    def unread_count(self, user_id: uuid.UUID) -> int:
        return self.repository.unread_count(user_id)

    def create(
        self,
        *,
        recipient_user_id: uuid.UUID,
        event_type: str,
        title: str,
        message: str,
        related_type: str | None,
        related_id: uuid.UUID | None,
        idempotency_key: str,
        read_at=None,
    ) -> Notification:
        existing = self.repository.get_by_event_key(recipient_user_id, idempotency_key)
        if existing is not None:
            return existing
        notification = Notification(
            recipient_user_id=recipient_user_id,
            event_type=event_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
            idempotency_key=idempotency_key,
            read_at=read_at,
        )
        self.repository.add(notification)
        self.db.flush()
        return notification

    def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> NotificationResponse:
        notification = self.repository.mark_read(notification_id, user_id)
        if notification is None:
            raise HTTPException(status_code=404, detail="Notificação não encontrada.")
        self.db.commit()
        self.db.refresh(notification)
        return NotificationResponse.model_validate(notification)

    def notify_users_with_permission(
        self,
        permission_code: str,
        *,
        event_type: str,
        title: str,
        message: str,
        related_type: str,
        related_id: uuid.UUID,
        idempotency_key: str,
    ) -> list[Notification]:
        users = (
            self.db.scalars(
                select(User)
                .options(selectinload(User.roles).selectinload(Role.permissions))
                .where(User.is_active)
            )
            .unique()
            .all()
        )
        recipients = [user for user in users if has_permission(user.roles, permission_code)]
        return self._create_for_users(
            recipients,
            event_type=event_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
            idempotency_key=idempotency_key,
        )

    def notify_translator(
        self,
        translator: Translator,
        *,
        event_type: str,
        title: str,
        message: str,
        related_type: str,
        related_id: uuid.UUID,
        idempotency_key: str,
    ) -> list[Notification]:
        user = self.db.scalar(
            select(User).where(User.is_active, User.email.ilike(translator.email))
        )
        if user is None:
            return []
        return self._create_for_users(
            [user],
            event_type=event_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
            idempotency_key=idempotency_key,
        )

    def _create_for_users(
        self,
        users: list[User],
        *,
        event_type: str,
        title: str,
        message: str,
        related_type: str,
        related_id: uuid.UUID,
        idempotency_key: str,
    ) -> list[Notification]:
        notifications = []
        for user in users:
            if self.repository.get_by_event_key(user.id, idempotency_key) is not None:
                continue
            notification = Notification(
                recipient_user_id=user.id,
                event_type=event_type,
                title=title,
                message=message,
                related_type=related_type,
                related_id=related_id,
                idempotency_key=idempotency_key,
            )
            self.repository.add(notification)
            notifications.append(notification)
        return notifications
