import uuid

from app.modules.seed.seed_notifications import seed_notifications
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.auth.models.roles import Role
from app.modules.notifications.models.notification import Notification


def create_seed_users(db: Session) -> tuple[User, User]:
    users = (
        User(
            email=f"admin-{uuid.uuid4()}@example.com",
            password_hash="hashed",
            is_active=True,
            role="admin",
        ),
        User(
            email=f"operador-{uuid.uuid4()}@example.com",
            password_hash="hashed",
            is_active=True,
            role="operador",
        ),
    )
    db.add_all(users)
    db.flush()
    return users


def notifications_for(db: Session, user: User) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.recipient_user_id == user.id)
            .order_by(Notification.idempotency_key)
        ).all()
    )


def test_seed_creates_notifications_for_existing_admin_and_operator(
    isolated_db_session: Session,
) -> None:
    admin, operator = create_seed_users(isolated_db_session)

    seed_notifications(db=isolated_db_session)

    assert notifications_for(isolated_db_session, admin)
    assert notifications_for(isolated_db_session, operator)


def test_seed_includes_certificate_and_document_events_as_read_and_unread(
    isolated_db_session: Session,
) -> None:
    admin, operator = create_seed_users(isolated_db_session)

    seed_notifications(db=isolated_db_session)

    seeded = notifications_for(isolated_db_session, admin) + notifications_for(
        isolated_db_session, operator
    )
    event_types = {notification.event_type for notification in seeded}
    related_types = {notification.related_type for notification in seeded}

    assert any("certificate" in event_type for event_type in event_types)
    assert any("document" in event_type for event_type in event_types)
    assert "certificate" in related_types
    assert "document" in related_types
    assert any(notification.read_at is None for notification in seeded)
    assert any(notification.read_at is not None for notification in seeded)
    assert all(notification.created_at is not None for notification in seeded)


def test_seed_is_idempotent_when_executed_twice(isolated_db_session: Session) -> None:
    admin, operator = create_seed_users(isolated_db_session)

    seed_notifications(db=isolated_db_session)
    first_count = isolated_db_session.scalar(select(func.count()).select_from(Notification))
    first_keys = {
        (notification.recipient_user_id, notification.idempotency_key)
        for notification in notifications_for(isolated_db_session, admin)
        + notifications_for(isolated_db_session, operator)
    }

    seed_notifications(db=isolated_db_session)

    second_count = isolated_db_session.scalar(select(func.count()).select_from(Notification))
    second_keys = {
        (notification.recipient_user_id, notification.idempotency_key)
        for notification in notifications_for(isolated_db_session, admin)
        + notifications_for(isolated_db_session, operator)
    }
    assert second_count == first_count
    assert second_keys == first_keys


def test_seed_does_not_create_notifications_for_nonexistent_user(
    isolated_db_session: Session,
) -> None:
    admin, operator = create_seed_users(isolated_db_session)
    nonexistent_email = f"missing-{uuid.uuid4()}@example.com"
    before = isolated_db_session.scalar(select(func.count()).select_from(Notification))

    seed_notifications(db=isolated_db_session, user_emails=[nonexistent_email])

    after = isolated_db_session.scalar(select(func.count()).select_from(Notification))
    assert after == before
    assert notifications_for(isolated_db_session, admin) == []
    assert notifications_for(isolated_db_session, operator) == []
    assert (
        isolated_db_session.scalar(
            select(func.count()).select_from(User).where(User.email == nonexistent_email)
        )
        == 0
    )


def test_seed_uses_effective_roles_in_addition_to_legacy_role(
    isolated_db_session: Session,
) -> None:
    _admin, operator = create_seed_users(isolated_db_session)
    operator.roles.append(Role(name="Administrador", is_active=True))
    isolated_db_session.flush()

    seed_notifications(db=isolated_db_session)

    event_types = {item.event_type for item in notifications_for(isolated_db_session, operator)}
    assert "certificate_received" in event_types
    assert "certificate_approved" in event_types
