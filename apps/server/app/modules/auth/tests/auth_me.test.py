import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.shared.database import get_db


class FakeDatabaseSession:
    def __init__(self, user: User | None) -> None:
        self.user = user

    def scalar(self, _statement: object) -> User | None:
        return self.user


def test_auth_me_returns_role_names_and_effective_permissions() -> None:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="operator@example.com",
        password_hash="unused",
        role="tradutor",
        is_active=True,
        roles=[
            Role(
                id=uuid.uuid4(),
                name="Recursos externos",
                is_active=True,
                permissions=[Permission(code="assignments.read")],
            ),
            Role(
                id=uuid.uuid4(),
                name="Desativada",
                is_active=False,
                permissions=[Permission(code="quotes.read")],
            ),
        ],
    )
    app.dependency_overrides[get_db] = lambda: FakeDatabaseSession(user)
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(user_id), email=user.email
    )

    try:
        response = TestClient(app).get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "user": {"id": str(user_id), "email": "operator@example.com"},
        "roles": [{"id": str(user.roles[0].id), "name": "Recursos externos"}],
        "permissions": ["assignments.read"],
    }


def test_auth_me_rejects_an_authenticated_identity_without_a_local_user() -> None:
    app.dependency_overrides[get_db] = lambda: FakeDatabaseSession(None)
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="missing@example.com"
    )

    try:
        response = TestClient(app).get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
