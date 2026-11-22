from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import QUOTE_STATUS_DRAFT, Quote
from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemUpdate,
)
from app.modules.quotes.services.translation_item_service import TranslationItemService


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


def make_draft_quote(db_session: Session) -> Quote:
    quote = Quote(status=QUOTE_STATUS_DRAFT)
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)
    return quote


def day(offset: int) -> datetime:
    target = datetime.now(UTC) + timedelta(days=offset)
    return target.replace(hour=0, minute=0, second=0, microsecond=0)


def test_create_item_stores_deadline_and_word_count(db_session: Session) -> None:
    quote = make_draft_quote(db_session)
    deadline = day(7)

    item = TranslationItemService(db_session).create_item(
        quote.id,
        QuoteTranslationItemCreate(
            source_language="pt-BR",
            target_language="en-US",
            word_count=900,
            deadline=deadline,
        ),
    )

    assert item.deadline == deadline
    assert item.word_count == 900


def test_create_item_rejects_deadline_before_today(db_session: Session) -> None:
    quote = make_draft_quote(db_session)

    with pytest.raises(HTTPException) as error:
        TranslationItemService(db_session).create_item(
            quote.id,
            QuoteTranslationItemCreate(
                source_language="pt-BR", target_language="en-US", deadline=day(-3)
            ),
        )

    assert error.value.status_code == 422
    assert "prazo" in error.value.detail.lower()


def test_update_item_changes_deadline(db_session: Session) -> None:
    quote = make_draft_quote(db_session)
    service = TranslationItemService(db_session)
    item = service.create_item(
        quote.id,
        QuoteTranslationItemCreate(
            source_language="pt-BR", target_language="en-US", deadline=day(5)
        ),
    )
    new_deadline = day(12)

    updated = service.update_item(
        quote.id, item.id, QuoteTranslationItemUpdate(deadline=new_deadline)
    )

    assert updated.deadline == new_deadline


def test_update_item_rejects_new_deadline_before_today(db_session: Session) -> None:
    quote = make_draft_quote(db_session)
    service = TranslationItemService(db_session)
    item = service.create_item(
        quote.id, QuoteTranslationItemCreate(source_language="pt-BR", target_language="en-US")
    )

    with pytest.raises(HTTPException) as error:
        service.update_item(quote.id, item.id, QuoteTranslationItemUpdate(deadline=day(-3)))

    assert error.value.status_code == 422


def test_update_item_allows_resending_an_unchanged_past_deadline(db_session: Session) -> None:
    quote = make_draft_quote(db_session)
    service = TranslationItemService(db_session)
    item = service.create_item(
        quote.id, QuoteTranslationItemCreate(source_language="pt-BR", target_language="en-US")
    )
    past = day(-2)
    item.deadline = past
    db_session.commit()

    updated = service.update_item(
        quote.id, item.id, QuoteTranslationItemUpdate(deadline=past, word_count=500)
    )

    assert updated.deadline == past
    assert updated.word_count == 500
