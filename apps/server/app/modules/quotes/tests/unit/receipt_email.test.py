from decimal import Decimal
from unittest.mock import patch

import pytest

from app.modules.quotes.services.receipt_email import ReceiptEmailService


def test_send_quote_approved_email_template_not_found(tmp_path):
    service = ReceiptEmailService(template_path=str(tmp_path / "nonexistent.html"))

    with pytest.raises(FileNotFoundError):
        service.send_quote_approved_email(
            to_email="test@example.com",
            quote_code="3FA85F64",
            total_value=Decimal("1240.00"),
            approval_date="03/11/2026 10:00",
            pdf_bytes=b"pdf content",
        )


def test_send_quote_approved_email_renders_default_template():
    service = ReceiptEmailService()

    with patch("app.modules.quotes.services.receipt_email.send_email") as send_email:
        service.send_quote_approved_email(
            to_email="test@example.com",
            quote_code="3FA85F64",
            total_value=Decimal("1240.00"),
            approval_date="03/11/2026 10:00",
            pdf_bytes=b"pdf content",
        )

    kwargs = send_email.call_args.kwargs
    assert kwargs["to"] == "test@example.com"
    assert "#3FA85F64" in kwargs["html_body"]
    assert "R$ 1.240,00" in kwargs["html_body"]
    assert "03/11/2026 10:00" in kwargs["html_body"]
    assert "{{" not in kwargs["html_body"]
    assert "(11) 3384-8550" in kwargs["html_body"]
    assert 'src="cid:logo-alianca"' in kwargs["html_body"]
    [(content_id, logo_bytes, content_type)] = kwargs["inline_images"]
    assert content_id == "logo-alianca"
    assert content_type == "image/png"
    assert logo_bytes[1:4] == b"PNG"
    assert kwargs["attachments"] == [
        ("comprovante_orcamento.pdf", b"pdf content", "application/pdf")
    ]
