import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.notifications.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_event_key(self, recipient_user_id: uuid.UUID, idempotency_key: str):
        return self.db.scalar(
            select(Notification).where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.idempotency_key == idempotency_key,
            )
        )

    def add(self, notification: Notification) -> Notification:
        self.db.add(notification)
        return notification

    def list_for_user(
        self,
        recipient_user_id: uuid.UUID,
        *,
        event_type: str | None,
        is_read: bool | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Notification], int]:
        filters = [Notification.recipient_user_id == recipient_user_id]
        if event_type is not None:
            filters.append(Notification.event_type == event_type)
        if is_read is True:
            filters.append(Notification.read_at.is_not(None))
        elif is_read is False:
            filters.append(Notification.read_at.is_(None))

        query = select(Notification).where(*filters).order_by(Notification.created_at.desc())
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = list(
            self.db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
        )
        return items, total

    def unread_count(self, recipient_user_id: uuid.UUID) -> int:
        return self.db.scalar(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.read_at.is_(None),
            )
        ) or 0

    def mark_read(self, notification_id: uuid.UUID, recipient_user_id: uuid.UUID) -> Notification | None:
        notification = self.db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recipient_user_id == recipient_user_id,
            )
        )
        if notification is None:
            return None
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
        return notification
