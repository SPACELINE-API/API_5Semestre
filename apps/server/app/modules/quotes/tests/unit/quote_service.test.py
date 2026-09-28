import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.schemas.quote import QuoteCreate
from app.modules.quotes.services.quote_service import QuoteService


def test_create_quote_success(mock_db_session):
    service = QuoteService(mock_db_session)
    quote_data = QuoteCreate()

    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.create_quote(quote_data)

    assert result is not None
    assert result.status == "pending"
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()


def approved_request() -> Request:
    return Request(
        id=uuid.uuid4(),
        customer_name="João Silva",
        enterprise="Empresa X",
        email="joao@teste.com",
        original_language="Português",
        translation_language="Inglês",
        customer_need="Contrato social",
        status=StatusEnum.APPROVED,
    )


def test_generate_quote_from_approved_request(mock_db_session):
    request = approved_request()
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=None)
    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.generate_from_approved_request(request.id)

    assert result.request_id == request.id
    assert result.status == "pending"
    assert result.customer_name == request.customer_name
    mock_db_session.commit.assert_called_once()


def test_generate_quote_requires_approved_request(mock_db_session):
    request = approved_request()
    request.status = StatusEnum.PENDING
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)

    with pytest.raises(HTTPException) as error:
        service.generate_from_approved_request(request.id)

    assert error.value.status_code == 400
    assert error.value.detail == "A requisição precisa estar aprovada."
    mock_db_session.commit.assert_not_called()


def test_generate_quote_rejects_unknown_request(mock_db_session):
    request_id = uuid.uuid4()
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=None)

    with pytest.raises(HTTPException) as error:
        service.generate_from_approved_request(request_id)

    assert error.value.status_code == 404
    mock_db_session.commit.assert_not_called()


def test_generate_quote_rejects_duplicate(mock_db_session):
    request = approved_request()
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=object())

    with pytest.raises(HTTPException) as error:
        service.generate_from_approved_request(request.id)

    assert error.value.status_code == 409
    mock_db_session.commit.assert_not_called()
