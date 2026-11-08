import re
import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import (
    get_current_user,
    get_supabase_admin_client,
)
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.shared.database import get_db

SETUP_LINK_PATTERN = re.compile(r"definir-senha\?token=([A-Za-z0-9_\-]+)")


class FakeSupabaseAdminClient:
    def __init__(self) -> None:
        self.users: dict[str, dict[str, Any]] = {}
        self.fail = False

    def create_or_get_user(self, email: str, password: str) -> dict[str, Any]:
        from app.modules.auth.exceptions.exceptions import SupabaseAdminUnexpectedError

        if self.fail:
            raise SupabaseAdminUnexpectedError("boom")
        existing = self.users.get(email)
        if existing is not None:
            return {"id": existing["id"], "email": email}
        user = {"id": str(uuid.uuid4()), "email": email, "password": password}
        self.users[email] = user
        return {"id": user["id"], "email": email}

    def update_user(
        self, user_id: str, *, email: str | None = None, password: str | None = None
    ) -> dict[str, Any]:
        from app.modules.auth.exceptions.exceptions import SupabaseAdminUnexpectedError

        if self.fail:
            raise SupabaseAdminUnexpectedError("boom")
        entry = next(user for user in self.users.values() if user["id"] == user_id)
        if email is not None:
            self.users.pop(entry["email"])
            entry["email"] = email
            self.users[email] = entry
        if password is not None:
            entry["password"] = password
        return {"id": user_id}


@dataclass
class InternalUsersEnv:
    client: TestClient
    db: Session
    admin_client: FakeSupabaseAdminClient
    actor: User
    sent_emails: list[dict[str, str]] = field(default_factory=list)
    fail_email: bool = False

    def role(self, name: str, permissions: tuple[str, ...] = (), *, active: bool = True) -> Role:
        role = Role(name=name, is_active=active)
        for code in permissions:
            permission = self.db.query(Permission).filter_by(code=code).first()
            if permission is None:
                permission = Permission(code=code)
                self.db.add(permission)
            role.permissions.append(permission)
        self.db.add(role)
        self.db.flush()
        return role

    def act_as(self, user: User) -> None:
        app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
            id=str(user.id), email=user.email
        )

    def create_person(
        self, role: Role, *, email: str = "ana@example.com", name: str = "Ana Souza"
    ) -> dict[str, Any]:
        response = self.client.post(
            "/api/internal-users",
            json={"name": name, "email": email, "role_ids": [str(role.id)]},
        )
        assert response.status_code == 201, response.text
        return response.json()

    def last_token(self) -> str:
        match = SETUP_LINK_PATTERN.search(self.sent_emails[-1]["html_body"])
        assert match is not None
        return match.group(1)


@pytest.fixture
def env(
    isolated_db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> Iterator[InternalUsersEnv]:
    db = isolated_db_session
    admin_role = Role(name="Administrador")
    actor = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        password_hash="unused",
        role="admin",
        is_active=True,
        roles=[admin_role],
    )
    db.add(actor)
    db.flush()

    admin_client = FakeSupabaseAdminClient()
    environment = InternalUsersEnv(
        client=TestClient(app), db=db, admin_client=admin_client, actor=actor
    )

    def fake_send_email(**kwargs: Any) -> None:
        if environment.fail_email:
            raise RuntimeError("smtp down")
        environment.sent_emails.append(kwargs)

    monkeypatch.setattr(
        "app.modules.internal_users.services.password_setup_email.send_email", fake_send_email
    )

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_supabase_admin_client] = lambda: admin_client
    environment.act_as(actor)
    try:
        yield environment
    finally:
        app.dependency_overrides.clear()
