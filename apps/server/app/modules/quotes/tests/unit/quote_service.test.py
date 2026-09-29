import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.schemas.quote import QuoteCreate, QuoteUpdate
from app.modules.quotes.services import quote_service as quote_service_module
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


def test_generate_quote_transfers_request_document_to_new_item(
    mock_db_session, monkeypatch
):
    request = approved_request()
    request.document = b"conteudo-do-arquivo"
    request.document_filename = "diploma.pdf"
    request.document_content_type = "application/pdf"

    monkeypatch.setattr(
        quote_service_module,
        "upload_quote_document",
        lambda filename, file_data, content_type: "https://storage.test/diploma.pdf",
    )

    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=None)
    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.generate_from_approved_request(request.id)

    assert len(result.items) == 1
    item = result.items[0]
    assert item.file_url == "https://storage.test/diploma.pdf"
    assert item.document_type == request.customer_need
    assert item.source_language == request.original_language
    assert item.target_language == request.translation_language


def test_generate_quote_without_document_creates_no_item(mock_db_session):
    request = approved_request()
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=None)
    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.generate_from_approved_request(request.id)

    assert result.items == []


def test_update_quote_changes_provided_fields(mock_db_session):
    quote = MagicMock(company_id=None, contact_id=None)
    mock_db_session.query.return_value.filter.return_value.first.return_value = quote
    service = QuoteService(mock_db_session)

    service.update_quote(uuid.uuid4(), QuoteUpdate(customer_name="Novo nome"))

    assert quote.customer_name == "Novo nome"
    mock_db_session.commit.assert_called_once()


def test_update_quote_not_found_raises_404(mock_db_session):
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    service = QuoteService(mock_db_session)

    with pytest.raises(HTTPException) as error:
        service.update_quote(uuid.uuid4(), QuoteUpdate(customer_name="Novo nome"))

    assert error.value.status_code == 404
