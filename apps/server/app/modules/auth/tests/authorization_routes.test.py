import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.shared.database import get_db


def test_role_permission_changes_are_audited_with_actor_and_timestamp(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    actor_id = uuid.uuid4()
    role_write = Permission(code="roles.write")
    role_read = Permission(code="roles.read")
    admin_role = Role(
        name="Gerenciador de roles",
        permissions=[role_write, role_read],
    )
    actor = User(
        id=actor_id,
        email="role-admin@example.com",
        password_hash="unused",
        role="admin",
        roles=[admin_role],
    )
    quote_read = Permission(code="quotes.read")
    quote_write = Permission(code="quotes.write")
    db.add_all([actor, quote_read, quote_write])
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(actor_id), email=actor.email
    )

    try:
        client = TestClient(app)
        created = client.post(
            "/api/roles",
            json={
                "name": "Projetos de teste",
                "permission_ids": [str(quote_read.id)],
            },
        )
        assert created.status_code == 201
        role_id = created.json()["id"]

        updated = client.patch(
            f"/api/roles/{role_id}",
            json={"permission_ids": [str(quote_read.id), str(quote_write.id)]},
        )
        assert updated.status_code == 200

        history = client.get("/api/roles/audit?target_type=role")
        assert history.status_code == 200
        entries = [entry for entry in history.json() if entry["target_id"] == role_id]
    finally:
        app.dependency_overrides.clear()

    entries_by_action = {entry["action"]: entry for entry in entries}
    assert entries_by_action.keys() == {"updated", "created"}
    assert all(entry["actor_user_id"] == str(actor_id) for entry in entries)
    assert all(entry["actor_email"] == actor.email for entry in entries)
    assert all(entry["created_at"] for entry in entries)
    assert entries_by_action["updated"]["before"]["permissions"] == ["quotes.read"]
    assert entries_by_action["updated"]["after"]["permissions"] == [
        "quotes.read",
        "quotes.write",
    ]


def test_user_role_assignment_is_audited_and_exposes_effective_permissions(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    actor_id = uuid.uuid4()
    target_id = uuid.uuid4()
    user_write = Permission(code="users.write")
    user_read = Permission(code="users.read")
    admin_role = Role(name="Gerenciador de usuários", permissions=[user_write, user_read])
    actor = User(
        id=actor_id,
        email="user-admin@example.com",
        password_hash="unused",
        role="admin",
        roles=[admin_role],
    )
    client_role = Role(
        name="Leitura de clientes",
        permissions=[Permission(code="clients.read")],
    )
    target = User(
        id=target_id,
        email="target@example.com",
        password_hash="unused",
        role="legacy",
    )
    db.add_all([actor, client_role, target])
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(actor_id), email=actor.email
    )

    try:
        response = TestClient(app).put(
            f"/api/users/{target_id}/roles",
            json={"role_ids": [str(client_role.id)]},
        )
        history = db.scalars(
            select(AuthorizationAuditLog).where(
                AuthorizationAuditLog.target_type == "user",
                AuthorizationAuditLog.target_id == target_id,
            )
        ).all()
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["permissions"] == ["clients.read"]
    assert len(history) == 1
    assert history[0].actor_user_id == actor_id
    assert history[0].before == {"roles": []}
    assert history[0].after == {"roles": ["Leitura de clientes"]}


def test_deactivating_role_revokes_its_users_effective_access(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    admin_id = uuid.uuid4()
    target_id = uuid.uuid4()
    roles_write = Permission(code="roles.write")
    quotes_read = Permission(code="quotes.read")
    admin_role = Role(name="Administrador de teste", permissions=[roles_write])
    assigned_role = Role(name="Leitura de orçamentos", permissions=[quotes_read])
    administrator = User(
        id=admin_id,
        email="role-admin@example.com",
        password_hash="unused",
        role="admin",
        roles=[admin_role],
    )
    target = User(
        id=target_id,
        email="quote-reader@example.com",
        password_hash="unused",
        role="custom",
        roles=[assigned_role],
    )
    db.add_all([administrator, target])
    db.flush()

    current_identity = SupabaseAuthenticatedUser(id=str(admin_id), email=administrator.email)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: current_identity

    try:
        client = TestClient(app)
        deactivated = client.patch(
            f"/api/roles/{assigned_role.id}/status",
            json={"is_active": False},
        )

        current_identity = SupabaseAuthenticatedUser(id=str(target_id), email=target.email)
        denied_quotes = client.get("/api/quotes")
        access_summary = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert denied_quotes.status_code == 403
    assert access_summary.status_code == 200
    assert access_summary.json()["roles"] == []
    assert access_summary.json()["permissions"] == []
    assert target.roles == [assigned_role]
    assert assigned_role.is_active is False
