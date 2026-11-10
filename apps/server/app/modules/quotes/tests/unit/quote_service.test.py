import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.models.quote_audit_log import QuoteAuditLog
from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.schemas.quote import (
    QuoteCreate,
    QuoteReopenRequest,
    QuoteStatusUpdate,
    QuoteUpdate,
)
from app.modules.quotes.services import quote_service as quote_service_module
from app.modules.quotes.services.quote_service import QuoteService


def test_create_quote_success(mock_db_session):
    service = QuoteService(mock_db_session)
    quote_data = QuoteCreate()

    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.create_quote(quote_data)

    assert result is not None
    assert result.status == "draft"
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
    assert result.status == "draft"
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


def test_generate_quote_transfers_request_document_to_new_item(mock_db_session, monkeypatch):
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


def test_generate_quote_reuses_uploaded_request_document_url(mock_db_session):
    request = approved_request()
    request.document_filename = "diploma.pdf"
    request.document_url = "https://storage.test/requests/diploma.pdf"

    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=None)
    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.generate_from_approved_request(request.id)

    assert len(result.items) == 1
    assert result.items[0].file_url == request.document_url


def test_generate_quote_without_document_creates_no_item(mock_db_session):
    request = approved_request()
    service = QuoteService(mock_db_session)
    service.request_repository.get_by_id = MagicMock(return_value=request)
    service.quote_repository.get_by_request_id = MagicMock(return_value=None)
    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.generate_from_approved_request(request.id)

    assert result.items == []


def test_update_quote_changes_provided_fields(mock_db_session):
    quote = MagicMock(company_id=None, contact_id=None, status="draft")
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


def pending_quote_with_service_order(mock_db_session):
    quote = MagicMock(id=uuid.uuid4(), status="pending", service_orders=[MagicMock()])
    query = mock_db_session.query.return_value.filter.return_value.with_for_update.return_value
    query.first.return_value = quote
    return quote


def test_update_status_approved_creates_receipt(mock_db_session, monkeypatch):
    quote = pending_quote_with_service_order(mock_db_session)
    receipt_service = MagicMock()
    monkeypatch.setattr(
        quote_service_module, "QuoteReceiptService", MagicMock(return_value=receipt_service)
    )
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    result = QuoteService(mock_db_session).update_status(
        quote.id, QuoteStatusUpdate(status="approved"), user
    )

    assert result.status == "approved"
    receipt_service.create_receipt.assert_called_once_with(quote)


def test_update_status_approved_survives_receipt_failure(mock_db_session, monkeypatch):
    quote = pending_quote_with_service_order(mock_db_session)
    receipt_service = MagicMock()
    receipt_service.create_receipt.side_effect = RuntimeError("smtp down")
    monkeypatch.setattr(
        quote_service_module, "QuoteReceiptService", MagicMock(return_value=receipt_service)
    )
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    result = QuoteService(mock_db_session).update_status(
        quote.id, QuoteStatusUpdate(status="approved"), user
    )

    assert result.status == "approved"
    mock_db_session.commit.assert_called_once()


def test_update_status_reproved_does_not_create_receipt(mock_db_session, monkeypatch):
    quote = pending_quote_with_service_order(mock_db_session)
    receipt_cls = MagicMock()
    monkeypatch.setattr(quote_service_module, "QuoteReceiptService", receipt_cls)
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    QuoteService(mock_db_session).update_status(
        quote.id, QuoteStatusUpdate(status="reproved", reproval_reason="Fora do escopo"), user
    )

    receipt_cls.assert_not_called()


def pending_quote_without_service_order(mock_db_session, file_urls):
    items = [MagicMock(file_url=file_url) for file_url in file_urls]
    quote = MagicMock(
        id=uuid.uuid4(),
        status="pending",
        service_orders=[],
        company_id=uuid.uuid4(),
        items=items,
    )
    query = mock_db_session.query.return_value.filter.return_value.with_for_update.return_value
    query.first.return_value = quote
    return quote


@pytest.mark.parametrize(
    "file_urls",
    [[None], ["   "], ["https://storage.test/contrato.pdf", None]],
)
def test_update_status_rejects_approval_with_document_without_file(mock_db_session, file_urls):
    quote = pending_quote_without_service_order(mock_db_session, file_urls)
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).update_status(
            quote.id, QuoteStatusUpdate(status="approved"), user
        )

    assert error.value.status_code == 422
    assert (
        error.value.detail == "Anexe o arquivo de todos os documentos antes de aprovar o orçamento."
    )
    assert quote.status == "pending"
    mock_db_session.commit.assert_not_called()


def test_update_status_reproval_does_not_require_document_file(mock_db_session, monkeypatch):
    quote = pending_quote_without_service_order(mock_db_session, [None])
    monkeypatch.setattr(quote_service_module, "QuoteReceiptService", MagicMock())
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    result = QuoteService(mock_db_session).update_status(
        quote.id, QuoteStatusUpdate(status="reproved", reproval_reason="Sem arquivo"), user
    )

    assert result.status == "reproved"


def quote_for_update(mock_db_session, status):
    quote = MagicMock(id=uuid.uuid4(), status=status, service_orders=[])
    query = mock_db_session.query.return_value.filter.return_value.with_for_update.return_value
    query.first.return_value = quote
    return quote


@pytest.mark.parametrize("status", ["pending", "approved", "reproved", "cancelled"])
def test_update_quote_rejects_locked_status(mock_db_session, status):
    quote = MagicMock(company_id=None, contact_id=None, status=status, customer_name="Antigo")
    mock_db_session.query.return_value.filter.return_value.first.return_value = quote

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).update_quote(
            uuid.uuid4(), QuoteUpdate(customer_name="Novo nome")
        )

    assert error.value.status_code == 409
    assert "precisa estar em preparação" in error.value.detail
    assert quote.customer_name == "Antigo"
    mock_db_session.commit.assert_not_called()


def test_send_to_customer_moves_draft_to_pending(mock_db_session):
    quote = quote_for_update(mock_db_session, "draft")

    result = QuoteService(mock_db_session).send_to_customer(quote.id)

    assert result.status == "pending"
    mock_db_session.commit.assert_called_once()


@pytest.mark.parametrize("status", ["pending", "approved", "reproved", "cancelled"])
def test_send_to_customer_rejects_non_draft(mock_db_session, status):
    quote = quote_for_update(mock_db_session, status)

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).send_to_customer(quote.id)

    assert error.value.status_code == 409
    assert quote.status == status
    mock_db_session.commit.assert_not_called()


@pytest.mark.parametrize("status", ["draft", "approved", "reproved", "cancelled"])
def test_update_status_requires_pending(mock_db_session, status):
    quote = quote_for_update(mock_db_session, status)
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).update_status(
            quote.id, QuoteStatusUpdate(status="approved"), user
        )

    assert error.value.status_code == 409
    assert "aguardando aprovação" in error.value.detail
    assert quote.status == status


@pytest.mark.parametrize("status", ["pending", "approved", "reproved"])
def test_reopen_moves_quote_to_draft_and_records_audit(mock_db_session, status):
    quote = quote_for_update(mock_db_session, status)
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    result = QuoteService(mock_db_session).reopen(
        quote.id, QuoteReopenRequest(reason="  Cliente enviou novo documento  "), user
    )

    assert result.status == "draft"
    audit = mock_db_session.add.call_args.args[0]
    assert isinstance(audit, QuoteAuditLog)
    assert audit.action == "reopen"
    assert audit.previous_status == status
    assert audit.new_status == "draft"
    assert audit.reason == "Cliente enviou novo documento"
    assert audit.actor_user_id == uuid.UUID(user.id)
    assert audit.actor_email == "admin@teste.com"
    mock_db_session.commit.assert_called_once()


def test_reopen_keeps_existing_service_order(mock_db_session):
    service_order = MagicMock()
    quote = quote_for_update(mock_db_session, "approved")
    quote.service_orders = [service_order]
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    QuoteService(mock_db_session).reopen(quote.id, QuoteReopenRequest(reason="Ajuste"), user)

    assert quote.service_orders == [service_order]
    mock_db_session.delete.assert_not_called()


@pytest.mark.parametrize("status", ["draft", "cancelled"])
def test_reopen_rejects_draft_and_cancelled(mock_db_session, status):
    quote = quote_for_update(mock_db_session, status)
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).reopen(quote.id, QuoteReopenRequest(reason="Ajuste"), user)

    assert error.value.status_code == 409
    assert quote.status == status
    mock_db_session.add.assert_not_called()
    mock_db_session.commit.assert_not_called()


def test_reopen_not_found_raises_404(mock_db_session):
    query = mock_db_session.query.return_value.filter.return_value.with_for_update.return_value
    query.first.return_value = None
    user = MagicMock(id=str(uuid.uuid4()), email="admin@teste.com")

    with pytest.raises(HTTPException) as error:
        QuoteService(mock_db_session).reopen(uuid.uuid4(), QuoteReopenRequest(reason="x"), user)

    assert error.value.status_code == 404


@pytest.mark.parametrize("reason", ["", "   "])
def test_reopen_schema_requires_reason(reason):
    with pytest.raises(ValueError, match="Informe o motivo da reabertura"):
        QuoteReopenRequest(reason=reason)


def test_reopen_schema_rejects_missing_reason():
    with pytest.raises(ValueError):
        QuoteReopenRequest()
