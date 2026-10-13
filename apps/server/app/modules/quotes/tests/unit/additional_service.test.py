from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.modules.quotes.models import AdditionalService
from app.modules.quotes.schemas.additional_service import (
    AdditionalServiceCreate,
    AdditionalServiceResponse,
)
from app.modules.quotes.services.additional_service import (
    AdditionalServiceConflictError,
    AdditionalServiceNotFoundError,
    AdditionalServiceService,
)


@pytest.fixture
def service() -> AdditionalServiceService:
    additional_service_service = AdditionalServiceService(MagicMock())
    additional_service_service.repository = MagicMock()
    additional_service_service.quote_repository = MagicMock()
    additional_service_service.service_order_repository = MagicMock()
    return additional_service_service


def test_additional_service_service_order_id_is_optional_and_indexed():
    column = AdditionalService.__table__.c.service_order_id

    assert column.nullable
    assert column.index


def test_additional_service_service_order_foreign_key_cascades_on_delete():
    foreign_key = next(iter(AdditionalService.__table__.c.service_order_id.foreign_keys))

    assert foreign_key.target_fullname == "service_orders.id"
    assert foreign_key.ondelete == "CASCADE"


def test_create_schema_accepts_quote_target():
    quote_id = uuid4()

    payload = AdditionalServiceCreate(
        quote_id=quote_id,
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    assert payload.quote_id == quote_id
    assert payload.service_order_id is None


def test_create_schema_accepts_service_order_target():
    service_order_id = uuid4()

    payload = AdditionalServiceCreate(
        service_order_id=service_order_id,
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    assert payload.service_order_id == service_order_id
    assert payload.quote_id is None


@pytest.mark.parametrize(
    ("quote_id", "service_order_id"),
    [
        (None, None),
        (uuid4(), uuid4()),
    ],
)
def test_create_schema_requires_exactly_one_target(quote_id, service_order_id):
    with pytest.raises(ValidationError):
        AdditionalServiceCreate(
            quote_id=quote_id,
            service_order_id=service_order_id,
            description="Tradução de documento secundário",
            price=Decimal("150.00"),
        )


def test_create_schema_strips_description():
    payload = AdditionalServiceCreate(
        quote_id=uuid4(),
        description="  Tradução de documento secundário  ",
        price=Decimal("150.00"),
    )

    assert payload.description == "Tradução de documento secundário"


@pytest.mark.parametrize(
    ("description", "price"),
    [
        ("   ", Decimal("150.00")),
        ("Tradução de documento secundário", Decimal("-1.00")),
        ("Tradução de documento secundário", Decimal("10.123")),
        ("Tradução de documento secundário", Decimal("123456789.00")),
        ("a" * 256, Decimal("150.00")),
    ],
)
def test_create_schema_rejects_invalid_fields(description, price):
    with pytest.raises(ValidationError):
        AdditionalServiceCreate(
            quote_id=uuid4(),
            description=description,
            price=price,
        )


def test_response_schema_reads_model_attributes():
    now = datetime(2026, 10, 12, 10, 0, tzinfo=UTC)
    additional_service = AdditionalService(
        id=uuid4(),
        quote_id=uuid4(),
        service_order_id=uuid4(),
        created_by=None,
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
        status="pending",
        created_at=now,
        updated_at=now,
    )

    response = AdditionalServiceResponse.model_validate(additional_service)

    assert response.id == additional_service.id
    assert response.quote_id == additional_service.quote_id
    assert response.service_order_id == additional_service.service_order_id
    assert response.price == Decimal("150.00")


def test_create_additional_service_for_quote(service: AdditionalServiceService):
    quote_id = uuid4()
    service.quote_repository.get_by_id.return_value = MagicMock(id=quote_id)
    service.repository.create_additional_service.side_effect = lambda item: item
    payload = AdditionalServiceCreate(
        quote_id=quote_id,
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    result = service.create_additional_service(payload)

    assert result.quote_id == quote_id
    assert result.service_order_id is None
    assert result.description == "Tradução de documento secundário"
    assert result.price == Decimal("150.00")
    service.service_order_repository.get_by_id.assert_not_called()


def test_create_additional_service_for_service_order_uses_its_quote(
    service: AdditionalServiceService,
):
    quote_id = uuid4()
    service_order_id = uuid4()
    service.service_order_repository.get_by_id.return_value = MagicMock(quote_id=quote_id)
    service.repository.create_additional_service.side_effect = lambda item: item
    payload = AdditionalServiceCreate(
        service_order_id=service_order_id,
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    result = service.create_additional_service(payload)

    assert result.quote_id == quote_id
    assert result.service_order_id == service_order_id
    service.quote_repository.get_by_id.assert_not_called()


def test_create_additional_service_fails_when_quote_does_not_exist(
    service: AdditionalServiceService,
):
    service.quote_repository.get_by_id.return_value = None
    payload = AdditionalServiceCreate(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    with pytest.raises(AdditionalServiceNotFoundError, match="Orçamento não encontrado"):
        service.create_additional_service(payload)

    service.repository.create_additional_service.assert_not_called()


def test_create_additional_service_fails_when_service_order_does_not_exist(
    service: AdditionalServiceService,
):
    service.service_order_repository.get_by_id.return_value = None
    payload = AdditionalServiceCreate(
        service_order_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    with pytest.raises(AdditionalServiceNotFoundError, match="Ordem de serviço não encontrada"):
        service.create_additional_service(payload)

    service.repository.create_additional_service.assert_not_called()


def test_create_additional_service_raises_conflict_on_duplicate_description(
    service: AdditionalServiceService,
):
    service.quote_repository.get_by_id.return_value = MagicMock(id=uuid4())
    service.repository.create_additional_service.side_effect = IntegrityError(
        "INSERT", {}, Exception("duplicate key")
    )
    payload = AdditionalServiceCreate(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
    )

    with pytest.raises(AdditionalServiceConflictError):
        service.create_additional_service(payload)


def test_get_additional_service_returns_found_item(service: AdditionalServiceService):
    additional_service = MagicMock()
    service.repository.get_additional_service_by_id.return_value = additional_service

    assert service.get_additional_service(uuid4()) is additional_service


def test_get_additional_service_fails_when_not_found(service: AdditionalServiceService):
    service.repository.get_additional_service_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Serviço adicional não encontrado"):
        service.get_additional_service(uuid4())


def test_delete_additional_service_removes_found_item(service: AdditionalServiceService):
    additional_service = MagicMock()
    service.repository.get_additional_service_by_id.return_value = additional_service

    service.delete_additional_service(uuid4())

    service.repository.delete_additional_service.assert_called_once_with(additional_service)


def test_delete_additional_service_fails_when_not_found(service: AdditionalServiceService):
    service.repository.get_additional_service_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError):
        service.delete_additional_service(uuid4())

    service.repository.delete_additional_service.assert_not_called()


@pytest.mark.parametrize(
    ("quote_id", "service_order_id"),
    [
        (None, None),
        (uuid4(), uuid4()),
    ],
)
def test_list_additional_services_requires_exactly_one_filter(
    service: AdditionalServiceService,
    quote_id,
    service_order_id,
):
    with pytest.raises(ValueError):
        service.list_additional_services(quote_id, service_order_id)


def test_list_additional_services_by_quote(service: AdditionalServiceService):
    quote_id = uuid4()
    expected = [MagicMock(), MagicMock()]
    service.quote_repository.get_by_id.return_value = MagicMock(id=quote_id)
    service.repository.list_additional_services_by_quote.return_value = expected

    result = service.list_additional_services(quote_id=quote_id)

    assert result == expected
    service.repository.list_additional_services_by_quote.assert_called_once_with(quote_id)
    service.repository.list_additional_services_by_service_order.assert_not_called()


def test_list_additional_services_by_service_order(service: AdditionalServiceService):
    service_order_id = uuid4()
    expected = [MagicMock()]
    service.service_order_repository.get_by_id.return_value = MagicMock(id=service_order_id)
    service.repository.list_additional_services_by_service_order.return_value = expected

    result = service.list_additional_services(service_order_id=service_order_id)

    assert result == expected
    service.repository.list_additional_services_by_service_order.assert_called_once_with(
        service_order_id
    )
    service.repository.list_additional_services_by_quote.assert_not_called()


def test_list_additional_services_fails_when_quote_does_not_exist(
    service: AdditionalServiceService,
):
    service.quote_repository.get_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Orçamento não encontrado"):
        service.list_additional_services(quote_id=uuid4())

    service.repository.list_additional_services_by_quote.assert_not_called()


def test_list_additional_services_fails_when_service_order_does_not_exist(
    service: AdditionalServiceService,
):
    service.service_order_repository.get_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Ordem de serviço não encontrada"):
        service.list_additional_services(service_order_id=uuid4())

    service.repository.list_additional_services_by_service_order.assert_not_called()
