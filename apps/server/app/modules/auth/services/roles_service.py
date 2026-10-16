from collections.abc import Iterable

from app.modules.auth.models.roles import Role


def deactivate_role(role: Role) -> None:
    role.is_active = False


def get_effective_permissions(roles: Iterable[Role]) -> set[str]:
    return {permission.code for role in roles if role.is_active for permission in role.permissions}


def has_permission(roles: Iterable[Role], permission_code: str) -> bool:
    active_roles = tuple(role for role in roles if role.is_active)
    has_full_access = any(
        role.name.strip().casefold() in {"administrador", "admin", "operador"}
        for role in active_roles
    )
    if has_full_access:
        return True
    return permission_code in get_effective_permissions(active_roles)
