import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.quotes.models import Quote, QuoteReceiptVersion, QuoteTranslationItem
from app.modules.quotes.services import receipt_service as receipt_module
from app.modules.quotes.services.receipt_service import QuoteReceiptService


@pytest.fixture
def service(isolated_db_session: Session, monkeypatch) -> QuoteReceiptService:
    monkeypatch.setattr(
        receipt_module,
        "upload_receipt_pdf",
        lambda filename, file_data, content_type: f"https://storage.test/{filename}",
    )
    receipt_service = QuoteReceiptService(isolated_db_session)
    receipt_service.pdf_generator = MagicMock()
    receipt_service.pdf_generator.generate_receipt.return_value = b"%PDF"
    receipt_service.email_service = MagicMock()
    return receipt_service


def make_approved_quote(db: Session) -> Quote:
    company = Company(
        legal_name="Empresa de Teste Ltda",
        trade_name="Empresa de Teste",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        industry="juridico",
        phone="11987654321",
        email=f"cliente-{uuid.uuid4().hex[:10]}@example.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    quote = Quote(company=company, status="approved", approved_at=datetime.now(UTC))
    quote.items = [
        QuoteTranslationItem(
            source_language="pt-BR",
            target_language="en-US",
            estimated_value=Decimal("100.00"),
        )
    ]
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def test_first_approval_creates_receipt_version_one(service, isolated_db_session):
    quote = make_approved_quote(isolated_db_session)

    service.create_receipt(quote)

    versions = service.list_versions(quote.id)
    assert [version.version for version in versions] == [1]
    assert versions[0].status == "sent"
    assert versions[0].pdf_url.endswith(f"receipt_{quote.id}_v1.pdf")
    assert service.email_service.send_quote_approved_email.call_args.kwargs["version"] == 1


def test_same_approval_does_not_duplicate_receipt(service, isolated_db_session):
    quote = make_approved_quote(isolated_db_session)
    service.create_receipt(quote)

    service.create_receipt(quote)

    assert len(service.list_versions(quote.id)) == 1
    service.pdf_generator.generate_receipt.assert_called_once()


def test_new_approval_creates_new_receipt_and_keeps_previous(service, isolated_db_session):
    quote = make_approved_quote(isolated_db_session)
    service.create_receipt(quote)
    first_pdf = quote.receipt_pdf_url

    quote.approved_at = datetime.now(UTC) + timedelta(seconds=1)
    isolated_db_session.commit()
    service.create_receipt(quote)

    versions = service.list_versions(quote.id)
    assert [version.version for version in versions] == [2, 1]
    assert versions[1].pdf_url == first_pdf
    assert versions[0].pdf_url.endswith("_v2.pdf")
    assert quote.receipt_pdf_url == versions[0].pdf_url
    assert service.email_service.send_quote_approved_email.call_args.kwargs["version"] == 2
    assert isolated_db_session.query(QuoteReceiptVersion).filter_by(quote_id=quote.id).count() == 2
