from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import app.modules.models  # noqa: F401
from app.modules.quotes.models import AdditionalService, Quote
from app.modules.quotes.repositories.additional_service_repository import (
    AdditionalServiceRepository,
)


def test_additional_service_created_in_quote_has_no_service_order(
    isolated_db_session: Session,
):
    quote = Quote()
    quote.additional_services = [
        AdditionalService(
            description="Tradução de documento secundário",
            price=Decimal("50.00"),
            status="pending",
        )
    ]
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    isolated_db_session.expire_all()

    persisted_quote = isolated_db_session.get(Quote, quote.id)

    assert persisted_quote is not None
    assert persisted_quote.additional_services[0].service_order_id is None


def test_additional_service_rejects_unknown_service_order_reference(
    isolated_db_session: Session,
):
    quote = Quote()
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    additional_service = AdditionalService(
        quote_id=quote.id,
        service_order_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("50.00"),
        status="pending",
    )

    with pytest.raises(IntegrityError):
        with isolated_db_session.begin_nested():
            isolated_db_session.add(additional_service)
            isolated_db_session.flush()


def test_repository_lists_additional_services_of_quote_ordered_by_creation(
    isolated_db_session: Session,
):
    quote = Quote()
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    created_at = datetime(2026, 10, 12, 10, 0, tzinfo=UTC)
    first = AdditionalService(
        quote_id=quote.id,
        description="Tradução de documento secundário",
        price=Decimal("50.00"),
        status="pending",
        created_at=created_at,
    )
    second = AdditionalService(
        quote_id=quote.id,
        description="Diagramação",
        price=Decimal("30.25"),
        status="pending",
        created_at=created_at + timedelta(hours=1),
    )
    isolated_db_session.add_all([second, first])
    isolated_db_session.flush()

    result = AdditionalServiceRepository(isolated_db_session).list_additional_services_by_quote(
        quote.id
    )

    assert [item.id for item in result] == [first.id, second.id]


def test_repository_does_not_list_additional_services_of_other_quotes(
    isolated_db_session: Session,
):
    quote = Quote()
    other_quote = Quote()
    quote.additional_services = [
        AdditionalService(
            description="Tradução de documento secundário",
            price=Decimal("50.00"),
            status="pending",
        )
    ]
    other_quote.additional_services = [
        AdditionalService(
            description="Tradução de documento secundário",
            price=Decimal("50.00"),
            status="pending",
        )
    ]
    isolated_db_session.add_all([quote, other_quote])
    isolated_db_session.flush()

    result = AdditionalServiceRepository(isolated_db_session).list_additional_services_by_quote(
        quote.id
    )

    assert [item.id for item in result] == [quote.additional_services[0].id]


def test_repository_returns_empty_list_for_quote_without_additional_services(
    isolated_db_session: Session,
):
    quote = Quote()
    isolated_db_session.add(quote)
    isolated_db_session.flush()

    result = AdditionalServiceRepository(isolated_db_session).list_additional_services_by_quote(
        quote.id
    )

    assert result == []


def test_repository_returns_empty_list_for_service_order_without_additional_services(
    isolated_db_session: Session,
):
    result = AdditionalServiceRepository(
        isolated_db_session
    ).list_additional_services_by_service_order(uuid4())

    assert result == []


def test_repository_gets_additional_service_by_id(
    isolated_db_session: Session,
):
    quote = Quote()
    quote.additional_services = [
        AdditionalService(
            description="Tradução de documento secundário",
            price=Decimal("50.00"),
            status="pending",
        )
    ]
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    additional_service_id = quote.additional_services[0].id

    found = AdditionalServiceRepository(isolated_db_session).get_additional_service_by_id(
        additional_service_id
    )

    assert found is not None
    assert found.id == additional_service_id


def test_repository_returns_none_for_unknown_additional_service(
    isolated_db_session: Session,
):
    found = AdditionalServiceRepository(isolated_db_session).get_additional_service_by_id(uuid4())

    assert found is None
