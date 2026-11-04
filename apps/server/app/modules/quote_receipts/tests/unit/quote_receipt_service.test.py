from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.clients.models.company import Company
from app.modules.quote_receipts.models.quote_receipt import QuoteReceipt
from app.modules.quote_receipts.services.quote_receipt_service import (
    QuoteReceiptNotFoundError,
    QuoteReceiptService,
)
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem


@pytest.fixture
def approved_quote():
    company = Company(
        id=uuid4(),
        legal_name="Empresa Teste Ltda",
        trade_name="Empresa Teste",
        cnpj="12.345.678/0001-90",
        industry="Serviços",
        phone="11999999999",
        email="empresa@teste.com",
        zip_code="01000-000",
        street="Rua Teste",
        number="123",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
    )

    quote = Quote(
        id=uuid4(),
        company=company,
        company_id=company.id,
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
        customer_name="João Silva",
        customer_need="Contrato Social",
    )

    item = QuoteTranslationItem(
        id=uuid4(),
        quote_id=quote.id,
        source_language="Português",
        target_language="Inglês",
        document_type="Contrato",
        estimated_value=Decimal("150.00"),
    )

    quote.items = [item]

    return quote


def test_create_receipt_success(mock_db_session, approved_quote):
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.refresh.side_effect = lambda obj: None
    mock_db_session.add.side_effect = lambda obj: None

    service = QuoteReceiptService(mock_db_session, logo_path=None)

    with patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf content"):
        with patch(
            "app.modules.quote_receipts.services.quote_receipt_service.upload_receipt_pdf",
            return_value="http://storage.test/receipt.pdf",
        ):
            with patch.object(service.email_service, "send_quote_approved_email"):
                result = service.create_receipt(approved_quote)

    assert result is not None


def test_create_receipt_requires_company(mock_db_session):
    quote = Quote(
        id=uuid4(),
        company_id=None,
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
    )

    service = QuoteReceiptService(mock_db_session)

    with pytest.raises(HTTPException) as exc:
        service.create_receipt(quote)

    assert exc.value.status_code == 422
    assert "Empresa não vinculada" in exc.value.detail


def test_create_receipt_company_not_found(mock_db_session):
    quote = Quote(
        id=uuid4(),
        company_id=uuid4(),
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
    )
    mock_db_session.get.return_value = None

    service = QuoteReceiptService(mock_db_session)

    with pytest.raises(HTTPException) as exc:
        service.create_receipt(quote)

    assert exc.value.status_code == 404


def test_create_receipt_company_no_email(mock_db_session, approved_quote):
    approved_quote.company.email = None
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.refresh.side_effect = lambda obj: None

    service = QuoteReceiptService(mock_db_session)

    with pytest.raises(HTTPException) as exc:
        service.create_receipt(approved_quote)

    assert exc.value.status_code == 422
    assert "e-mail" in exc.value.detail.lower()


def test_create_receipt_returns_existing(mock_db_session, approved_quote):
    existing_receipt = QuoteReceipt(
        id=uuid4(),
        quote_id=approved_quote.id,
        company_id=approved_quote.company_id,
        status="sent",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.query.return_value.filter.return_value.first.return_value = existing_receipt

    service = QuoteReceiptService(mock_db_session)

    result = service.create_receipt(approved_quote)

    assert result == existing_receipt


def test_create_receipt_pdf_generation_error(mock_db_session, approved_quote):
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.refresh.side_effect = lambda obj: None
    mock_db_session.add.side_effect = lambda obj: None

    service = QuoteReceiptService(mock_db_session, logo_path=None)

    with patch.object(
        service.pdf_generator, "generate_receipt", side_effect=Exception("PDF error")
    ):
        result = service.create_receipt(approved_quote)

    assert result is not None


def test_create_receipt_upload_error(mock_db_session, approved_quote):
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.refresh.side_effect = lambda obj: None
    mock_db_session.add.side_effect = lambda obj: None

    service = QuoteReceiptService(mock_db_session, logo_path=None)

    with patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf content"):
        with patch(
            "app.modules.quote_receipts.services.quote_receipt_service.upload_receipt_pdf",
            side_effect=Exception("Upload error"),
        ):
            result = service.create_receipt(approved_quote)

    assert result is not None


def test_create_receipt_email_error_keeps_available_status(mock_db_session, approved_quote):
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.refresh.side_effect = lambda obj: None
    mock_db_session.add.side_effect = lambda obj: None

    service = QuoteReceiptService(mock_db_session, logo_path=None)

    with patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf content"):
        with patch(
            "app.modules.quote_receipts.services.quote_receipt_service.upload_receipt_pdf",
            return_value="http://storage.test/receipt.pdf",
        ):
            with patch.object(
                service.email_service,
                "send_quote_approved_email",
                side_effect=Exception("Email error"),
            ):
                result = service.create_receipt(approved_quote)

    assert result is not None


def test_get_by_quote_id_success(mock_db_session):
    receipt_id = uuid4()
    quote_id = uuid4()
    receipt = QuoteReceipt(
        id=receipt_id,
        quote_id=quote_id,
        company_id=uuid4(),
        status="sent",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = receipt
    mock_db_session.query.return_value = mock_query

    service = QuoteReceiptService(mock_db_session)
    result = service.get_by_quote_id(quote_id)

    assert result == receipt


def test_get_by_quote_id_not_found(mock_db_session):
    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = None
    mock_db_session.query.return_value = mock_query

    service = QuoteReceiptService(mock_db_session)

    with pytest.raises(QuoteReceiptNotFoundError):
        service.get_by_quote_id(uuid4())


def test_get_by_id_success(mock_db_session):
    receipt_id = uuid4()
    receipt = QuoteReceipt(
        id=receipt_id,
        quote_id=uuid4(),
        company_id=uuid4(),
        status="sent",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_db_session.get.return_value = receipt

    service = QuoteReceiptService(mock_db_session)
    result = service.get_by_id(receipt_id)

    assert result == receipt


def test_get_by_id_not_found(mock_db_session):
    mock_db_session.get.return_value = None

    service = QuoteReceiptService(mock_db_session)

    with pytest.raises(QuoteReceiptNotFoundError):
        service.get_by_id(uuid4())
