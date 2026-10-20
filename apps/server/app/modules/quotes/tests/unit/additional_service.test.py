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
    AdditionalServiceStatusUpdate,
    AdditionalServiceUpdate,
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
    return additional_service_service


def test_additional_service_has_no_service_order_reference():
    assert "service_order_id" not in AdditionalService.__table__.c


def test_create_schema_requires_quote_id():
    with pytest.raises(ValidationError):
        AdditionalServiceCreate(
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


def test_update_schema_accepts_partial_payload():
    payload = AdditionalServiceUpdate(price=Decimal("80.00"))

    assert payload.model_dump(exclude_unset=True) == {"price": Decimal("80.00")}


def test_update_schema_strips_description():
    payload = AdditionalServiceUpdate(description="  Revisão do documento  ")

    assert payload.description == "Revisão do documento"


def test_update_schema_requires_at_least_one_field():
    with pytest.raises(ValidationError, match="Informe ao menos um campo para atualizar"):
        AdditionalServiceUpdate()


@pytest.mark.parametrize(
    "payload",
    [
        {"description": None},
        {"description": "   "},
        {"description": "a" * 256},
        {"price": None},
        {"price": Decimal("-1.00")},
        {"price": Decimal("10.123")},
    ],
)
def test_update_schema_rejects_invalid_fields(payload):
    with pytest.raises(ValidationError):
        AdditionalServiceUpdate(**payload)


def test_response_schema_reads_model_attributes():
    now = datetime(2026, 10, 12, 10, 0, tzinfo=UTC)
    additional_service = AdditionalService(
        id=uuid4(),
        quote_id=uuid4(),
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
    assert response.price == Decimal("150.00")
    assert "service_order_id" not in response.model_dump()


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
    assert result.description == "Tradução de documento secundário"
    assert result.price == Decimal("150.00")
    service.quote_repository.get_by_id.assert_called_once_with(quote_id)


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


def test_list_additional_services_by_quote(service: AdditionalServiceService):
    quote_id = uuid4()
    expected = [MagicMock(), MagicMock()]
    service.quote_repository.get_by_id.return_value = MagicMock(id=quote_id)
    service.repository.list_additional_services_by_quote.return_value = expected

    result = service.list_additional_services(quote_id)

    assert result == expected
    service.repository.list_additional_services_by_quote.assert_called_once_with(quote_id)


def test_list_additional_services_fails_when_quote_does_not_exist(
    service: AdditionalServiceService,
):
    service.quote_repository.get_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Orçamento não encontrado"):
        service.list_additional_services(uuid4())

    service.repository.list_additional_services_by_quote.assert_not_called()


def test_update_additional_service_changes_only_sent_fields(
    service: AdditionalServiceService,
):
    additional_service = AdditionalService(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
        status="pending",
    )
    service.repository.get_additional_service_by_id.return_value = additional_service
    service.repository.update_additional_service.side_effect = lambda item: item

    result = service.update_additional_service(
        uuid4(), AdditionalServiceUpdate(price=Decimal("80.00"))
    )

    assert result.price == Decimal("80.00")
    assert result.description == "Tradução de documento secundário"
    service.repository.update_additional_service.assert_called_once_with(additional_service)


def test_update_additional_service_changes_description_and_price(
    service: AdditionalServiceService,
):
    additional_service = AdditionalService(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
        status="pending",
    )
    service.repository.get_additional_service_by_id.return_value = additional_service
    service.repository.update_additional_service.side_effect = lambda item: item

    result = service.update_additional_service(
        uuid4(),
        AdditionalServiceUpdate(description="Revisão do documento", price=Decimal("30.25")),
    )

    assert result.description == "Revisão do documento"
    assert result.price == Decimal("30.25")


def test_update_additional_service_fails_when_not_found(service: AdditionalServiceService):
    service.repository.get_additional_service_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Serviço adicional não encontrado"):
        service.update_additional_service(uuid4(), AdditionalServiceUpdate(price=Decimal("1.00")))

    service.repository.update_additional_service.assert_not_called()


def test_update_additional_service_rejects_completed_service(service: AdditionalServiceService):
    additional_service = AdditionalService(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
        status="approved",
    )
    service.repository.get_additional_service_by_id.return_value = additional_service

    with pytest.raises(
        AdditionalServiceConflictError,
        match="Não é possível editar um serviço adicional concluído",
    ):
        service.update_additional_service(uuid4(), AdditionalServiceUpdate(price=Decimal("80.00")))

    assert additional_service.price == Decimal("150.00")
    service.repository.update_additional_service.assert_not_called()


def test_update_additional_service_raises_conflict_on_duplicate_description(
    service: AdditionalServiceService,
):
    service.repository.get_additional_service_by_id.return_value = MagicMock()
    service.repository.update_additional_service.side_effect = IntegrityError(
        "UPDATE", {}, Exception("duplicate key")
    )

    with pytest.raises(
        AdditionalServiceConflictError,
        match="Já existe um serviço adicional com essa descrição neste orçamento",
    ):
        service.update_additional_service(
            uuid4(), AdditionalServiceUpdate(description="Revisão do documento")
        )


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


@pytest.mark.parametrize("status", ["pending", "approved", "reproved"])
def test_status_schema_accepts_model_statuses(status):
    assert AdditionalServiceStatusUpdate(status=status).status == status


@pytest.mark.parametrize("status", ["completed", "", "APPROVED"])
def test_status_schema_rejects_unknown_status(status):
    with pytest.raises(ValidationError):
        AdditionalServiceStatusUpdate(status=status)


def test_status_schema_requires_status():
    with pytest.raises(ValidationError):
        AdditionalServiceStatusUpdate()


def test_update_additional_service_status_marks_as_completed(
    service: AdditionalServiceService,
):
    additional_service = AdditionalService(
        quote_id=uuid4(),
        description="Tradução de documento secundário",
        price=Decimal("150.00"),
        status="pending",
    )
    service.repository.get_additional_service_by_id.return_value = additional_service
    service.repository.update_additional_service.side_effect = lambda item: item

    result = service.update_additional_service_status(
        uuid4(), AdditionalServiceStatusUpdate(status="approved")
    )

    assert result.status == "approved"
    assert result.description == "Tradução de documento secundário"
    assert result.price == Decimal("150.00")
    service.repository.update_additional_service.assert_called_once_with(additional_service)


def test_update_additional_service_status_fails_when_not_found(
    service: AdditionalServiceService,
):
    service.repository.get_additional_service_by_id.return_value = None

    with pytest.raises(AdditionalServiceNotFoundError, match="Serviço adicional não encontrado"):
        service.update_additional_service_status(
            uuid4(), AdditionalServiceStatusUpdate(status="approved")
        )

    service.repository.update_additional_service.assert_not_called()
