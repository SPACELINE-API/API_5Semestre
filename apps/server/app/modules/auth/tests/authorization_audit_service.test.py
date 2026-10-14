import uuid
from datetime import UTC, datetime

from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.services.authorization_audit_service import record_authorization_change


class FakeDatabaseSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.committed = False

    def add(self, value: object) -> None:
        self.added.append(value)


def test_record_authorization_change_adds_audit_data_without_committing() -> None:
    db = FakeDatabaseSession()
    actor_id = uuid.uuid4()
    target_id = uuid.uuid4()
    before = {"permissions": ["quotes.read"]}
    after = {"permissions": ["quotes.read", "quotes.update"]}
    created_at = datetime.now(UTC)

    audit_log = record_authorization_change(
        db,  # type: ignore[arg-type]
        target_type="role",
        target_id=target_id,
        target_name="Financeiro",
        action="updated",
        actor_user_id=actor_id,
        actor_email="admin@example.com",
        before=before,
        after=after,
    )
    audit_log.created_at = created_at

    assert db.added == [audit_log]
    assert isinstance(audit_log, AuthorizationAuditLog)
    assert audit_log.target_type == "role"
    assert audit_log.target_id == target_id
    assert audit_log.target_name == "Financeiro"
    assert audit_log.action == "updated"
    assert audit_log.actor_user_id == actor_id
    assert audit_log.actor_email == "admin@example.com"
    assert audit_log.before == before
    assert audit_log.after == after
    assert audit_log.created_at == created_at
    assert db.committed is False
