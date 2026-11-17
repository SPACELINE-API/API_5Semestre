import uuid

from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.services.roles_service import (
    deactivate_role,
    get_effective_permissions,
    get_user_effective_permissions,
)


def test_inactive_role_keeps_user_association_but_grants_no_permissions() -> None:
    permission = Permission(code="users.read")
    active_role = Role(name="Atendimento", is_active=True, permissions=[permission])
    inactive_role = Role(name="Projetos", is_active=False, permissions=[permission])

    effective_permissions = get_effective_permissions([active_role, inactive_role])

    assert effective_permissions == {"users.read"}


def test_only_permissions_from_active_roles_are_effective() -> None:
    active_permission = Permission(code="users.read")
    inactive_permission = Permission(code="quotes.approve")
    roles = [
        Role(name="Atendimento", is_active=True, permissions=[active_permission]),
        Role(name="Financeiro", is_active=False, permissions=[inactive_permission]),
    ]

    assert get_effective_permissions(roles) == {"users.read"}


def test_deactivating_role_preserves_its_associations_and_removes_its_effect() -> None:
    permission = Permission(code="quotes.approve")
    role = Role(name="Financeiro", is_active=True, permissions=[permission])

    deactivate_role(role)

    assert role.is_active is False
    assert role.permissions == [permission]
    assert get_effective_permissions([role]) == set()


def test_internal_user_always_receives_dashboard_read_as_a_baseline() -> None:
    user = User(
        id=uuid.uuid4(),
        email="ti@example.com",
        password_hash="unused",
        role="interno",
        roles=[
            Role(
                name="TI",
                is_active=True,
                permissions=[Permission(code="clients.read")],
            )
        ],
    )

    assert get_user_effective_permissions(user) == {"clients.read", "dashboard.read"}


def test_external_translator_does_not_receive_internal_dashboard_baseline() -> None:
    user = User(
        id=uuid.uuid4(),
        email="tradutor@example.com",
        password_hash="unused",
        role="tradutor",
        roles=[
            Role(
                name="Recursos externos",
                is_active=True,
                permissions=[Permission(code="assignments.read")],
            )
        ],
    )

    assert get_user_effective_permissions(user) == {"assignments.read"}
