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


def test_additional_service_is_persisted_with_its_quote(
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
    assert persisted_quote.additional_services[0].quote_id == quote.id


def test_additional_service_rejects_unknown_quote_reference(
    isolated_db_session: Session,
):
    additional_service = AdditionalService(
        quote_id=uuid4(),
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


def test_repository_updates_additional_service(
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
    additional_service = quote.additional_services[0]
    additional_service.description = "Tradução de documento secundário"
    additional_service.price = Decimal("80.00")

    AdditionalServiceRepository(isolated_db_session).update_additional_service(additional_service)
    isolated_db_session.expire_all()

    persisted = isolated_db_session.get(AdditionalService, additional_service.id)
    assert persisted is not None
    assert persisted.description == "Tradução de documento secundário"
    assert persisted.price == Decimal("80.00")


def test_repository_rejects_update_to_duplicated_description_in_quote(
    isolated_db_session: Session,
):
    quote = Quote()
    quote.additional_services = [
        AdditionalService(description="Tradução de documento secundário", price=Decimal("30.00"), status="pending"),
        AdditionalService(description="Revisão", price=Decimal("40.00"), status="pending"),
    ]
    isolated_db_session.add(quote)
    isolated_db_session.flush()
    revision = quote.additional_services[1]
    revision.description = " refazer tradução "

    with pytest.raises(IntegrityError):
        AdditionalServiceRepository(isolated_db_session).update_additional_service(revision)
