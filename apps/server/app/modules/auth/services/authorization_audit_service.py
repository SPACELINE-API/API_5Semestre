from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.auth.models.authorization_audit import AuthorizationAuditLog


def record_authorization_change(
    db: Session,
    *,
    target_type: str,
    target_id: UUID | None,
    target_name: str,
    action: str,
    actor_user_id: UUID | None,
    actor_email: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> AuthorizationAuditLog:
    """Stage an authorization audit record in the caller's transaction."""
    audit_log = AuthorizationAuditLog(
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        action=action,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        before=before,
        after=after,
    )
    db.add(audit_log)
    return audit_log
