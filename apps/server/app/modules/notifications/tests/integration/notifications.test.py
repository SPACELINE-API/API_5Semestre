import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.notifications.models.notification import Notification
from app.modules.notifications.services.notification_service import NotificationService
from app.shared.database import get_db


@pytest.fixture
def users(isolated_db_session: Session) -> tuple[User, User]:
    users = (
        User(
            email=f"notification-{uuid.uuid4()}@example.com",
            password_hash="hashed",
            is_active=True,
            role="tradutor",
        ),
        User(
            email=f"notification-{uuid.uuid4()}@example.com",
            password_hash="hashed",
            is_active=True,
            role="tradutor",
        ),
    )
    isolated_db_session.add_all(users)
    isolated_db_session.flush()
    return users


@pytest.fixture
def authenticated_client(isolated_db_session: Session, users: tuple[User, User]):
    owner, _ = users
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(owner.id), email=owner.email
    )
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


def create_notification(
    db: Session,
    recipient: User,
    *,
    event_type: str = "certificate_received",
    read: bool = False,
    idempotency_key: str | None = None,
) -> Notification:
    return NotificationService(db).create(
        recipient_user_id=recipient.id,
        event_type=event_type,
        title="Atualização de certificado",
        message="Seu certificado foi recebido.",
        related_type="certificate",
        related_id=uuid.uuid4(),
        idempotency_key=idempotency_key or str(uuid.uuid4()),
        read_at=func.now() if read else None,
    )


def test_service_persists_notification_and_list_endpoint_is_user_scoped(
    authenticated_client: TestClient,
    isolated_db_session: Session,
    users: tuple[User, User],
) -> None:
    owner, other = users
    own_notification = create_notification(isolated_db_session, owner)
    create_notification(isolated_db_session, other)

    response = authenticated_client.get("/api/notifications")

    isolated_db_session.expire_all()
    persisted = isolated_db_session.get(Notification, own_notification.id)
    assert persisted is not None
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [str(own_notification.id)]


def test_unread_count_and_list_filters_use_authenticated_user(
    authenticated_client: TestClient,
    isolated_db_session: Session,
    users: tuple[User, User],
) -> None:
    owner, other = users
    create_notification(isolated_db_session, owner)
    create_notification(isolated_db_session, owner, event_type="certificate_approved", read=True)
    create_notification(isolated_db_session, other)

    unread_count = authenticated_client.get("/api/notifications/unread-count")
    unread = authenticated_client.get("/api/notifications", params={"read": "false"})
    approved = authenticated_client.get(
        "/api/notifications", params={"event_type": "certificate_approved"}
    )

    assert unread_count.status_code == 200
    assert unread_count.json()["count"] == 1
    assert [item["event_type"] for item in unread.json()["items"]] == ["certificate_received"]
    assert [item["event_type"] for item in approved.json()["items"]] == ["certificate_approved"]


def test_mark_read_persists_and_does_not_allow_cross_user_updates(
    authenticated_client: TestClient,
    isolated_db_session: Session,
    users: tuple[User, User],
) -> None:
    owner, other = users
    own_notification = create_notification(isolated_db_session, owner)
    foreign_notification = create_notification(isolated_db_session, other)

    own_response = authenticated_client.patch(f"/api/notifications/{own_notification.id}/read")
    foreign_response = authenticated_client.patch(
        f"/api/notifications/{foreign_notification.id}/read"
    )

    isolated_db_session.expire_all()
    assert own_response.status_code == 200
    assert isolated_db_session.get(Notification, own_notification.id).read_at is not None
    assert foreign_response.status_code in {403, 404}
    assert isolated_db_session.get(Notification, foreign_notification.id).read_at is None


def test_replaying_notification_event_is_idempotent(
    isolated_db_session: Session,
    users: tuple[User, User],
) -> None:
    owner, _ = users
    key = f"certificate:{uuid.uuid4()}:received:1"

    first = create_notification(isolated_db_session, owner, idempotency_key=key)
    replay = create_notification(isolated_db_session, owner, idempotency_key=key)

    assert replay.id == first.id
    assert (
        isolated_db_session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.idempotency_key == key)
        )
        == 1
    )
