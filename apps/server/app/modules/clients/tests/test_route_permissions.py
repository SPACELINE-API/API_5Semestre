from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.shared.database import get_db


def test_clients_read_requires_and_accepts_permission(isolated_db_session: Session) -> None:
    db = isolated_db_session
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id="permission-test-user",
        email="permission-test@example.com",
    )

    try:
        client = TestClient(app)
        response = client.get("/api/clients")
        assert response.status_code == 403

        permission = Permission(code="clients.read")
        role = Role(name="Clients Reader", permissions=[permission])
        user = User(
            email="permission-test@example.com",
            password_hash="unused",
            role="Clients Reader",
            roles=[role],
        )
        db.add(user)
        db.flush()

        response = client.get("/api/clients")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        app.dependency_overrides.clear()
