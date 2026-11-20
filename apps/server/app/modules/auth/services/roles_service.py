from collections.abc import Iterable

from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User

INTERNAL_DASHBOARD_PERMISSION = "dashboard.read"
EXTERNAL_LEGACY_ROLE = "tradutor"


def deactivate_role(role: Role) -> None:
    role.is_active = False


def get_effective_permissions(roles: Iterable[Role]) -> set[str]:
    return {permission.code for role in roles if role.is_active for permission in role.permissions}


def get_user_effective_permissions(user: User) -> set[str]:
    permissions = get_effective_permissions(user.roles)
    if user.role.strip().casefold() != EXTERNAL_LEGACY_ROLE:
        permissions.add(INTERNAL_DASHBOARD_PERMISSION)
    return permissions


def has_permission(roles: Iterable[Role], permission_code: str) -> bool:
    active_roles = tuple(role for role in roles if role.is_active)
    has_full_access = any(
        role.name.strip().casefold() in {"administrador", "admin"} for role in active_roles
    )
    if has_full_access:
        return True
    return permission_code in get_effective_permissions(active_roles)
