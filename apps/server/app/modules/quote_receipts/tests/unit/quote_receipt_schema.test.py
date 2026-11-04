import uuid
from datetime import UTC, datetime

from app.modules.quote_receipts.models.quote_receipt import QuoteReceipt
from app.modules.quote_receipts.schemas.quote_receipt import (
    QuoteReceiptResponse,
    QuoteReceiptStatus,
)


def test_quote_receipt_status_enum():
    assert QuoteReceiptStatus.AVAILABLE.value == "available"
    assert QuoteReceiptStatus.SENT.value == "sent"
    assert QuoteReceiptStatus.ERROR.value == "error"


def test_quote_receipt_response_schema_reads_model_attributes():
    now = datetime(2026, 11, 3, 10, 0, tzinfo=UTC)
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="available",
        pdf_url="https://storage.test/receipt.pdf",
        sent_at=now,
        error_message=None,
        created_at=now,
        updated_at=now,
    )

    response = QuoteReceiptResponse.model_validate(receipt)

    assert response.id == receipt.id
    assert response.quote_id == receipt.quote_id
    assert response.company_id == receipt.company_id
    assert response.status == "available"
    assert response.pdf_url == "https://storage.test/receipt.pdf"
    assert response.sent_at == now
    assert response.error_message is None


def test_quote_receipt_response_accepts_optional_fields():
    now = datetime(2026, 11, 3, 10, 0, tzinfo=UTC)
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="available",
        pdf_url=None,
        sent_at=None,
        error_message=None,
        created_at=now,
        updated_at=now,
    )

    response = QuoteReceiptResponse.model_validate(receipt)

    assert response.pdf_url is None
    assert response.sent_at is None
    assert response.error_message is None


def test_quote_receipt_response_with_error():
    now = datetime(2026, 11, 3, 10, 0, tzinfo=UTC)
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="error",
        pdf_url=None,
        sent_at=None,
        error_message="Erro ao gerar PDF",
        created_at=now,
        updated_at=now,
    )

    response = QuoteReceiptResponse.model_validate(receipt)

    assert response.status == "error"
    assert response.error_message == "Erro ao gerar PDF"
