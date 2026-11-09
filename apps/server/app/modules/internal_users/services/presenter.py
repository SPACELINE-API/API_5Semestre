from app.modules.auth.models.user import User
from app.modules.auth.services.roles_service import get_effective_permissions
from app.modules.internal_users.models.password_setup_token import PasswordSetupToken
from app.modules.internal_users.schemas.internal_user import (
    InternalUserResponse,
    InternalUserRoleResponse,
    PasswordSetupLinkResponse,
)

STATUS_ATIVA = "ativa"
STATUS_INATIVA = "inativa"


def account_status(user: User) -> str:
    return STATUS_ATIVA if user.is_active else STATUS_INATIVA


def present_link(token: PasswordSetupToken | None) -> PasswordSetupLinkResponse | None:
    if token is None:
        return None
    return PasswordSetupLinkResponse(
        status=token.status,
        sent_at=token.created_at,
        expires_at=token.expires_at,
        used_at=token.used_at,
    )


def present_user(user: User, latest_token: PasswordSetupToken | None) -> InternalUserResponse:
    roles = sorted(user.roles, key=lambda role: role.name)
    active_roles = [role for role in roles if role.is_active]
    return InternalUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        is_active=user.is_active,
        status=account_status(user),
        password_defined=user.password_set_at is not None,
        roles=[InternalUserRoleResponse(id=role.id, name=role.name) for role in roles],
        permissions=sorted(get_effective_permissions(active_roles)),
        latest_link=present_link(latest_token),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def roles_snapshot(user: User) -> dict[str, object]:
    return {"roles": sorted(role.name for role in user.roles)}


def user_snapshot(user: User) -> dict[str, object]:
    return {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "is_active": user.is_active,
        "roles": sorted(role.name for role in user.roles),
    }
