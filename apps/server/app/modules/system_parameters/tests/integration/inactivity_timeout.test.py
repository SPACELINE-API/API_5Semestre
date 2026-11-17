from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.system_parameters.models.system_parameter import SystemParameter
from app.modules.system_parameters.repositories.inactivity_timeout import (
    INACTIVITY_TIMEOUT_KEY,
)
from app.shared.database import get_db

URL = "/api/support/inactivity-timeout"
USER_EMAIL = "inactivity-timeout@example.com"


@pytest.fixture
def db(isolated_db_session: Session) -> Iterator[Session]:
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    yield isolated_db_session
    app.dependency_overrides.clear()


@pytest.fixture
def client(db: Session) -> TestClient:
    return TestClient(app)


def authenticate() -> None:
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id="inactivity-timeout-user",
        email=USER_EMAIL,
    )


def create_user(db: Session, role_name: str, permissions: list[str] | None = None) -> None:
    role = Role(name=role_name, permissions=[Permission(code=code) for code in permissions or []])
    db.add(User(email=USER_EMAIL, password_hash="unused", role=role_name, roles=[role]))
    db.flush()


def test_get_requires_authentication(client: TestClient) -> None:
    response = client.get(URL)

    assert response.status_code in (401, 403)


def test_get_returns_default_timeout(client: TestClient) -> None:
    authenticate()

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == {"minutes": 30}


def test_get_returns_stored_timeout_for_any_authenticated_user(
    client: TestClient, db: Session
) -> None:
    authenticate()
    db.add(SystemParameter(key=INACTIVITY_TIMEOUT_KEY, value="15"))
    db.flush()

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == {"minutes": 15}


def test_patch_requires_authentication(client: TestClient) -> None:
    response = client.patch(URL, json={"minutes": 10})

    assert response.status_code in (401, 403)


def test_patch_rejects_user_without_settings_write_permission(
    client: TestClient, db: Session
) -> None:
    authenticate()
    create_user(db, "Tradutor", ["settings.read"])

    response = client.patch(URL, json={"minutes": 10})

    assert response.status_code == 403
    assert response.json() == {"detail": "Usuário sem permissão para esta operação"}


def test_patch_allows_non_administrator_with_settings_write_permission(
    client: TestClient, db: Session
) -> None:
    authenticate()
    create_user(db, "Configurações", ["settings.write"])

    response = client.patch(URL, json={"minutes": 25})

    assert response.status_code == 200
    assert response.json() == {"minutes": 25}


def test_patch_updates_timeout_for_administrator(client: TestClient, db: Session) -> None:
    authenticate()
    create_user(db, "Administrador")

    response = client.patch(URL, json={"minutes": 10})

    assert response.status_code == 200
    assert response.json() == {"minutes": 10}
    stored = db.scalar(select(SystemParameter).where(SystemParameter.key == INACTIVITY_TIMEOUT_KEY))
    assert stored is not None
    assert stored.value == "10"

    response = client.patch(URL, json={"minutes": 20})

    assert response.status_code == 200
    assert client.get(URL).json() == {"minutes": 20}


def test_patch_rejects_invalid_timeout(client: TestClient, db: Session) -> None:
    authenticate()
    create_user(db, "Administrador")

    response = client.patch(URL, json={"minutes": 0})

    assert response.status_code == 422
    assert (
        "O tempo limite de inatividade deve estar entre 1 e 1440 minutos"
        in response.json()["detail"][0]["msg"]
    )
