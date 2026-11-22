from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.schemas.receipt import QuoteReceiptResponse, QuoteReceiptStatus


def test_receipt_status_values():
    assert {status.value for status in QuoteReceiptStatus} == {"available", "sent", "error"}


def test_receipt_response_from_quote():
    generated_at = datetime(2026, 11, 3, 10, 0, tzinfo=UTC)
    quote = Quote(
        id=uuid4(),
        company_id=uuid4(),
        receipt_status="available",
        receipt_pdf_url="http://storage.test/receipt.pdf",
        receipt_generated_at=generated_at,
        receipt_error_message="Erro ao enviar e-mail: smtp down",
    )

    response = QuoteReceiptResponse.from_quote(quote)

    assert response.quote_id == quote.id
    assert response.company_id == quote.company_id
    assert response.status == QuoteReceiptStatus.AVAILABLE
    assert response.pdf_url == "http://storage.test/receipt.pdf"
    assert response.generated_at == generated_at
    assert response.sent_at is None
    assert response.error_message == "Erro ao enviar e-mail: smtp down"


def test_receipt_response_rejects_unknown_status():
    with pytest.raises(ValueError):
        QuoteReceiptResponse.from_quote(Quote(id=uuid4(), receipt_status="pending"))


def test_receipt_response_requires_status():
    with pytest.raises(ValidationError):
        QuoteReceiptResponse(quote_id=uuid4())


def test_receipt_response_requires_generated_receipt():
    with pytest.raises(ValueError):
        QuoteReceiptResponse.from_quote(Quote(id=uuid4(), receipt_status=None))
