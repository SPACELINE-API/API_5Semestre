import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.tasks.services import attachments
from app.shared.database import get_db


@dataclass
class TasksEnv:
    client: TestClient
    db: Session
    admin: User
    uploaded: dict[str, bytes] = field(default_factory=dict)
    deleted: list[str] = field(default_factory=list)

    def role(self, name: str, permissions: tuple[str, ...] = ()) -> Role:
        role = Role(name=f"{name}-{uuid.uuid4().hex[:6]}", is_active=True)
        for code in permissions:
            permission = self.db.query(Permission).filter_by(code=code).first()
            if permission is None:
                permission = Permission(code=code)
                self.db.add(permission)
            role.permissions.append(permission)
        self.db.add(role)
        return role

    def user(
        self,
        *,
        legacy_role: str = "interno",
        permissions: tuple[str, ...] = (),
        is_active: bool = True,
    ) -> User:
        user = User(
            id=uuid.uuid4(),
            email=f"{legacy_role}-{uuid.uuid4().hex[:8]}@example.com",
            name="Pessoa Teste",
            password_hash="unused",
            role=legacy_role,
            is_active=is_active,
            roles=[self.role("Perfil", permissions)],
        )
        self.db.add(user)
        self.db.flush()
        return user

    def act_as(self, user: User) -> None:
        app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
            id=str(user.id), email=user.email
        )

    def create_task(self, assignee: User, description: str = "Organizar contratos") -> dict:
        self.act_as(self.admin)
        response = self.client.post(
            "/api/tasks",
            json={
                "description": description,
                "due_date": "2026-12-01",
                "assignee_id": str(assignee.id),
            },
        )
        assert response.status_code == 201, response.text
        return response.json()


@pytest.fixture
def env(isolated_db_session: Session, monkeypatch: pytest.MonkeyPatch) -> Iterator[TasksEnv]:
    db = isolated_db_session
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        name="Admin",
        password_hash="unused",
        role="admin",
        is_active=True,
        roles=[Role(name="Administrador", is_active=True)],
    )
    db.add(admin)
    db.flush()
    environment = TasksEnv(client=TestClient(app), db=db, admin=admin)

    def fake_upload(object_path: str, content: bytes, _content_type: str) -> None:
        environment.uploaded[object_path] = content

    def fake_delete(object_path: str) -> None:
        environment.deleted.append(object_path)

    def fake_signed_url(object_path: str) -> str:
        return f"https://storage.test/{object_path}?token=signed"

    monkeypatch.setattr(attachments, "upload_attachment", fake_upload)
    monkeypatch.setattr(attachments, "delete_attachment", fake_delete)
    monkeypatch.setattr(attachments, "signed_attachment_url", fake_signed_url)

    app.dependency_overrides[get_db] = lambda: db
    environment.act_as(admin)
    try:
        yield environment
    finally:
        app.dependency_overrides.clear()


def pdf_file(name: str = "relatorio.pdf") -> dict[str, Any]:
    return {"file": (name, b"%PDF-1.4 conteudo %%EOF", "application/pdf")}
