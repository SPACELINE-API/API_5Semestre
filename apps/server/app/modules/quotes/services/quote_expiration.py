from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import (
    QUOTE_EXPIRABLE_STATUSES,
    QUOTE_STATUS_CANCELLED,
    QUOTE_VALIDITY_DAYS,
    Quote,
)
from app.modules.quotes.models.quote_audit_log import QUOTE_AUDIT_ACTION_EXPIRE, QuoteAuditLog

EXPIRATION_REASON = f"Prazo de validade de {QUOTE_VALIDITY_DAYS} dias expirado."


def validity_deadline(now: datetime | None = None) -> datetime:
    return (now or datetime.now(UTC)) - timedelta(days=QUOTE_VALIDITY_DAYS)


def is_quote_expired(quote: Quote, now: datetime | None = None) -> bool:
    if quote.status not in QUOTE_EXPIRABLE_STATUSES:
        return False
    starts_at = quote.validity_starts_at
    if not isinstance(starts_at, datetime):
        return False
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=UTC)
    return starts_at <= validity_deadline(now)


def cancel_expired_quote(db: Session, quote: Quote) -> None:
    previous_status = quote.status
    quote.status = QUOTE_STATUS_CANCELLED
    db.add(
        QuoteAuditLog(
            quote_id=quote.id,
            action=QUOTE_AUDIT_ACTION_EXPIRE,
            previous_status=previous_status,
            new_status=QUOTE_STATUS_CANCELLED,
            reason=EXPIRATION_REASON,
        )
    )


def expire_overdue_quotes(db: Session, now: datetime | None = None) -> int:
    quotes = (
        db.query(Quote)
        .filter(
            Quote.status.in_(QUOTE_EXPIRABLE_STATUSES),
            Quote.validity_starts_at <= validity_deadline(now),
        )
        .with_for_update(skip_locked=True)
        .all()
    )
    for quote in quotes:
        cancel_expired_quote(db, quote)
    if quotes:
        db.commit()
    return len(quotes)
