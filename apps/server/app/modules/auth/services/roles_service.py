from collections.abc import Iterable

from app.modules.auth.models.roles import Role


def deactivate_role(role: Role) -> None:
    role.is_active = False


def get_effective_permissions(roles: Iterable[Role]) -> set[str]:
    return {permission.code for role in roles if role.is_active for permission in role.permissions}


def has_permission(roles: Iterable[Role], permission_code: str) -> bool:
    return permission_code in get_effective_permissions(roles)
