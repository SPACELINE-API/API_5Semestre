from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import app.modules.models  # noqa: F401
from app.modules.quotes.models import AdditionalService, Quote, QuoteTranslationItem


def test_quote_total_sums_translation_items_and_additional_services(
    isolated_db_session: Session,
):
    quote = Quote()
    quote.items = [
        QuoteTranslationItem(
            source_language="pt",
            target_language="en",
            estimated_value=Decimal("125.50"),
        )
    ]
    quote.additional_services = [
        AdditionalService(
            description="Tradução de documento extra",
            price=Decimal("20.25"),
            status="approved",
        )
    ]
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    isolated_db_session.expire_all()

    persisted_quote = isolated_db_session.get(Quote, quote.id)

    assert persisted_quote is not None
    assert persisted_quote.total_value == Decimal("145.75")
    assert persisted_quote.additional_services[0].quote_id == quote.id


@pytest.mark.parametrize(
    ("description", "price", "status"),
    [
        ("Tradução extra", Decimal("-1.00"), "pending"),
        ("   ", Decimal("10.00"), "pending"),
        ("Tradução extra", Decimal("10.00"), "unknown"),
    ],
)
def test_database_rejects_invalid_additional_service_fields(
    isolated_db_session: Session,
    description: str,
    price: Decimal,
    status: str,
):
    quote = Quote()
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    additional_service = AdditionalService(
        quote_id=quote.id,
        description=description,
        price=price,
        status=status,
    )

    with pytest.raises(IntegrityError):
        with isolated_db_session.begin_nested():
            isolated_db_session.add(additional_service)
            isolated_db_session.flush()


def test_database_rejects_duplicate_additional_service_description_per_quote(
    isolated_db_session: Session,
):
    quote = Quote()
    quote.additional_services = [
        AdditionalService(
            description="Tradução de documento extra",
            price=Decimal("10.00"),
            status="pending",
        )
    ]
    isolated_db_session.add(quote)
    isolated_db_session.flush()

    duplicate = AdditionalService(
        quote_id=quote.id,
        description="  TRADUÇÃO DE DOCUMENTO EXTRA  ",
        price=Decimal("15.00"),
        status="pending",
    )

    with pytest.raises(IntegrityError):
        with isolated_db_session.begin_nested():
            isolated_db_session.add(duplicate)
            isolated_db_session.flush()


def test_additional_service_rejects_unknown_quote_reference(
    isolated_db_session: Session,
):
    additional_service = AdditionalService(
        quote_id=uuid4(),
        description="Tradução de documento extra",
        price=Decimal("10.00"),
        status="pending",
    )

    with pytest.raises(IntegrityError):
        with isolated_db_session.begin_nested():
            isolated_db_session.add(additional_service)
            isolated_db_session.flush()
