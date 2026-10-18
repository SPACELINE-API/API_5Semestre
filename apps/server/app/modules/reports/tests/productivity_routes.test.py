import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.reports.permissions import PRODUCTIVITY_READ_PERMISSION
from app.shared.database import get_db

REPORT_URL = "/api/reports/productivity"


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


@pytest.fixture
def authenticated_client(db_session):
    holder = {"email": "ninguem@example.com"}
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id="user-id", email=holder["email"]
    )
    with TestClient(app) as client:
        yield client, holder
    app.dependency_overrides.clear()


def make_user(db_session, email: str, permissions: list[str], role_active: bool = True) -> None:
    user = User(email=email, password_hash="hash", role="admin")
    role = Role(
        name=f"Role {uuid.uuid4().hex[:8]}",
        is_active=role_active,
        permissions=[Permission(code=code) for code in permissions],
    )
    user.roles = [role]
    db_session.add(user)
    db_session.commit()


def make_unique_user(db_session, permissions: list[str], role_active: bool = True) -> str:
    email = f"{uuid.uuid4().hex[:10]}@spaceline.com"
    make_user(db_session, email, permissions, role_active)
    return email


def test_user_without_roles_is_rejected(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(db_session, [])

    response = client.get(REPORT_URL)

    assert response.status_code == 403


def test_user_with_an_unrelated_permission_is_rejected(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(db_session, ["quotes.read"])

    assert client.get(REPORT_URL).status_code == 403
    assert client.get(f"{REPORT_URL}/filters").status_code == 403
    assert client.get(f"{REPORT_URL}/translators/{uuid.uuid4()}").status_code == 403


def test_user_with_an_inactive_role_is_rejected(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(
        db_session, [PRODUCTIVITY_READ_PERMISSION], role_active=False
    )

    assert client.get(REPORT_URL).status_code == 403


def test_unknown_user_is_rejected(authenticated_client) -> None:
    client, _holder = authenticated_client

    assert client.get(REPORT_URL).status_code == 403


def test_user_with_permission_gets_the_report(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(db_session, [PRODUCTIVITY_READ_PERMISSION])

    response = client.get(REPORT_URL, params={"date_from": "2026-03-01", "date_to": "2026-03-31"})

    assert response.status_code == 200
    body = response.json()
    assert body["period_start"] == "2026-03-01"
    assert body["period_end"] == "2026-03-31"
    assert body["summary"]["documents_translated"] == 0
    assert body["translators"] == []


def test_invalid_period_is_rejected_with_validation_error(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(db_session, [PRODUCTIVITY_READ_PERMISSION])

    response = client.get(REPORT_URL, params={"date_from": "2026-03-31", "date_to": "2026-03-01"})

    assert response.status_code == 422


def test_unknown_translator_returns_not_found(authenticated_client, db_session) -> None:
    client, holder = authenticated_client
    holder["email"] = make_unique_user(db_session, [PRODUCTIVITY_READ_PERMISSION])

    response = client.get(f"{REPORT_URL}/translators/{uuid.uuid4()}")

    assert response.status_code == 404
