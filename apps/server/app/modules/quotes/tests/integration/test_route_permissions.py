from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.shared.database import get_db


def test_quotes_read_returns_403_without_permission(isolated_db_session: Session) -> None:
    db = isolated_db_session
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id="permission-test-user",
        email="without-quote-permission@example.com",
    )

    try:
        response = TestClient(app).get("/api/quotes")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
