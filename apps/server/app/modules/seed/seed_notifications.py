import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.notifications.models.notification import Notification
from app.shared.database import get_session_factory

_NAMESPACE = uuid.UUID("b3f1a7a0-6d3d-4b47-a6f4-67aebc3dd900")


@dataclass(frozen=True)
class SeedNotification:
    event_type: str
    title: str
    message: str
    related_type: str
    related_id: uuid.UUID
    is_read: bool


ADMIN_NOTIFICATIONS = (
    SeedNotification(
        event_type="certificate_received",
        title="Novo certificado recebido",
        message="Um tradutor enviou um certificado para análise.",
        related_type="certificate",
        related_id=uuid.uuid5(_NAMESPACE, "certificate:received"),
        is_read=False,
    ),
    SeedNotification(
        event_type="document_received",
        title="Novo documento recebido",
        message="Um tradutor enviou um documento para análise.",
        related_type="document",
        related_id=uuid.uuid5(_NAMESPACE, "document:received"),
        is_read=True,
    ),
)

TRANSLATOR_NOTIFICATIONS = (
    SeedNotification(
        event_type="certificate_approved",
        title="Resultado do certificado",
        message="Seu certificado foi aprovado.",
        related_type="certificate",
        related_id=uuid.uuid5(_NAMESPACE, "certificate:approved"),
        is_read=False,
    ),
    SeedNotification(
        event_type="certificate_rejected",
        title="Resultado do certificado",
        message="Seu certificado foi reprovado.",
        related_type="certificate",
        related_id=uuid.uuid5(_NAMESPACE, "certificate:rejected"),
        is_read=True,
    ),
    SeedNotification(
        event_type="document_approved",
        title="Documento aprovado",
        message="Seu documento foi aprovado.",
        related_type="document",
        related_id=uuid.uuid5(_NAMESPACE, "document:approved"),
        is_read=False,
    ),
    SeedNotification(
        event_type="document_changes_requested",
        title="Ajustes solicitados no documento",
        message="Foram solicitados ajustes no documento entregue.",
        related_type="document",
        related_id=uuid.uuid5(_NAMESPACE, "document:changes-requested"),
        is_read=True,
    ),
)


def seed_notifications(
    *, db: Session | None = None, user_emails: list[str] | None = None
) -> int:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        users_query = select(User).where(User.is_active)
        if user_emails is not None:
            users_query = users_query.where(User.email.in_(user_emails))
        users = database_session.scalars(users_query).all()
        created = 0
        for user in users:
            events = _notifications_for_user(user)
            for index, event in enumerate(events):
                idempotency_key = f"seed:notification:{user.email}:{event.event_type}"
                existing = database_session.scalar(
                    select(Notification).where(
                        Notification.recipient_user_id == user.id,
                        Notification.idempotency_key == idempotency_key,
                    )
                )
                if existing is not None:
                    continue
                database_session.add(
                    Notification(
                        id=uuid.uuid5(_NAMESPACE, idempotency_key),
                        recipient_user_id=user.id,
                        event_type=event.event_type,
                        title=event.title,
                        message=event.message,
                        related_type=event.related_type,
                        related_id=event.related_id,
                        idempotency_key=idempotency_key,
                        created_at=datetime.now(UTC) - timedelta(days=index),
                        read_at=(datetime.now(UTC) - timedelta(hours=1))
                        if event.is_read
                        else None,
                    )
                )
                created += 1
        database_session.commit()
        return created
    finally:
        if should_close_session:
            database_session.close()


def _notifications_for_user(user: User) -> tuple[SeedNotification, ...]:
    legacy_role = user.role.strip().casefold()
    effective_roles = {
        role.name.strip().casefold() for role in user.roles if role.is_active
    }
    is_admin = legacy_role in {"admin", "administrador"} or bool(
        effective_roles & {"admin", "administrador"}
    )
    is_translator = legacy_role in {"tradutor", "translator", "operador", "operator"} or bool(
        effective_roles & {"tradutor", "translator", "operador", "operator", "recursos externos"}
    )
    notifications: list[SeedNotification] = []
    if is_admin:
        notifications.extend(ADMIN_NOTIFICATIONS)
    if is_translator:
        notifications.extend(TRANSLATOR_NOTIFICATIONS)
    return tuple(notifications)
