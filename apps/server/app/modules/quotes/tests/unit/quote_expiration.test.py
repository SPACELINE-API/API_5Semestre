from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.quote_audit_log import QuoteAuditLog
from app.modules.quotes.services.quote_expiration import (
    cancel_expired_quote,
    is_quote_expired,
)

NOW = datetime(2026, 11, 10, 12, 0, tzinfo=UTC)


def make_quote(status: str, days_ago: float) -> Quote:
    return Quote(status=status, validity_starts_at=NOW - timedelta(days=days_ago))


@pytest.mark.parametrize("status", ["draft", "pending"])
def test_quote_expires_after_thirty_days(status):
    assert is_quote_expired(make_quote(status, 30), NOW) is True
    assert is_quote_expired(make_quote(status, 31), NOW) is True


@pytest.mark.parametrize("status", ["draft", "pending"])
def test_quote_within_thirty_days_is_valid(status):
    assert is_quote_expired(make_quote(status, 29.9), NOW) is False


@pytest.mark.parametrize("status", ["approved", "reproved", "cancelled"])
def test_decided_quote_never_expires(status):
    assert is_quote_expired(make_quote(status, 90), NOW) is False


def test_valid_until_is_thirty_days_after_validity_start():
    quote = make_quote("pending", 0)

    assert quote.valid_until == NOW + timedelta(days=30)


def test_cancel_expired_quote_records_audit():
    db = MagicMock()
    quote = make_quote("pending", 31)

    cancel_expired_quote(db, quote)

    assert quote.status == "cancelled"
    audit = db.add.call_args.args[0]
    assert isinstance(audit, QuoteAuditLog)
    assert audit.action == "expire"
    assert audit.previous_status == "pending"
    assert audit.new_status == "cancelled"
    assert "30 dias" in audit.reason
    assert audit.actor_user_id is None
