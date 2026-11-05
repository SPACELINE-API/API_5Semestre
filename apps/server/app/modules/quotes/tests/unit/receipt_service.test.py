from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.services.receipt_service import (
    QuoteReceiptNotFoundError,
    QuoteReceiptService,
)

UPLOAD_PATH = "app.modules.quotes.services.receipt_service.upload_receipt_pdf"


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
    quote.items = [
        QuoteTranslationItem(
            id=uuid4(),
            quote_id=quote.id,
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato",
            estimated_value=Decimal("150.00"),
        )
    ]
    return quote


@pytest.fixture
def service(mock_db_session, approved_quote):
    mock_db_session.get.return_value = approved_quote.company
    mock_db_session.query.return_value.all.return_value = []
    return QuoteReceiptService(mock_db_session, logo_path=None)


def test_create_receipt_marks_sent_after_email(service, approved_quote, mock_db_session):
    with (
        patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf"),
        patch(UPLOAD_PATH, return_value="http://storage.test/receipt.pdf"),
        patch.object(service.email_service, "send_quote_approved_email") as send_email,
    ):
        result = service.create_receipt(approved_quote)

    assert result.receipt_status == "sent"
    assert result.receipt_pdf_url == "http://storage.test/receipt.pdf"
    assert result.receipt_generated_at is not None
    assert result.receipt_sent_at is not None
    assert result.receipt_error_message is None
    assert send_email.call_args.kwargs["to_email"] == "empresa@teste.com"
    assert send_email.call_args.kwargs["pdf_bytes"] == b"pdf"
    assert mock_db_session.commit.called


def test_create_receipt_email_error_keeps_available(service, approved_quote):
    with (
        patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf"),
        patch(UPLOAD_PATH, return_value="http://storage.test/receipt.pdf"),
        patch.object(
            service.email_service,
            "send_quote_approved_email",
            side_effect=Exception("smtp down"),
        ),
    ):
        result = service.create_receipt(approved_quote)

    assert result.receipt_status == "available"
    assert result.receipt_pdf_url == "http://storage.test/receipt.pdf"
    assert result.receipt_sent_at is None
    assert "smtp down" in result.receipt_error_message


def test_create_receipt_pdf_error_marks_error(service, approved_quote):
    with patch.object(service.pdf_generator, "generate_receipt", side_effect=Exception("boom")):
        with pytest.raises(HTTPException) as exc:
            service.create_receipt(approved_quote)

    assert exc.value.status_code == 500
    assert approved_quote.receipt_status == "error"
    assert "Erro ao gerar PDF" in approved_quote.receipt_error_message


def test_create_receipt_upload_error_marks_error(service, approved_quote):
    with (
        patch.object(service.pdf_generator, "generate_receipt", return_value=b"pdf"),
        patch(UPLOAD_PATH, side_effect=Exception("storage down")),
    ):
        with pytest.raises(HTTPException) as exc:
            service.create_receipt(approved_quote)

    assert exc.value.status_code == 500
    assert approved_quote.receipt_status == "error"
    assert "upload" in approved_quote.receipt_error_message


def test_create_receipt_does_not_regenerate_existing(service, approved_quote):
    approved_quote.receipt_status = "sent"

    with patch.object(service.pdf_generator, "generate_receipt") as generate:
        result = service.create_receipt(approved_quote)

    assert result is approved_quote
    generate.assert_not_called()


def test_create_receipt_requires_company(mock_db_session):
    quote = Quote(id=uuid4(), company_id=None, status="approved")

    with pytest.raises(HTTPException) as exc:
        QuoteReceiptService(mock_db_session).create_receipt(quote)

    assert exc.value.status_code == 422
    assert "Empresa não vinculada" in exc.value.detail


def test_create_receipt_company_not_found(mock_db_session):
    mock_db_session.get.return_value = None
    quote = Quote(id=uuid4(), company_id=uuid4(), status="approved")

    with pytest.raises(HTTPException) as exc:
        QuoteReceiptService(mock_db_session).create_receipt(quote)

    assert exc.value.status_code == 404


def test_create_receipt_company_without_email(service, approved_quote):
    approved_quote.company.email = None

    with pytest.raises(HTTPException) as exc:
        service.create_receipt(approved_quote)

    assert exc.value.status_code == 422
    assert "e-mail" in exc.value.detail
    assert approved_quote.receipt_status is None


def test_get_receipt_returns_quote_with_receipt(mock_db_session):
    quote = Quote(id=uuid4(), receipt_status="sent")
    mock_db_session.get.return_value = quote

    assert QuoteReceiptService(mock_db_session).get_receipt(quote.id) is quote


@pytest.mark.parametrize("quote", [None, Quote(id=uuid4(), receipt_status=None)])
def test_get_receipt_not_found(mock_db_session, quote):
    mock_db_session.get.return_value = quote

    with pytest.raises(QuoteReceiptNotFoundError):
        QuoteReceiptService(mock_db_session).get_receipt(uuid4())
