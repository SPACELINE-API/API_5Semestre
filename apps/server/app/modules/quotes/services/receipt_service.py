import io
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.quote_receipt_version import QuoteReceiptVersion
from app.modules.quotes.schemas.receipt import QuoteReceiptStatus
from app.modules.quotes.services.receipt_email import ReceiptEmailService
from app.modules.quotes.services.receipt_formatting import format_datetime_br, short_quote_code
from app.modules.quotes.services.receipt_pdf import ReceiptPDFGenerator
from app.modules.quotes.services.storage import upload_receipt_pdf
from app.modules.system_parameters.models.language import Language

DEFAULT_LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "receipt-logo-alianca.png"


class QuoteReceiptNotFoundError(Exception):
    pass


class QuoteReceiptService:
    def __init__(self, db: Session, logo_path: str | None = None):
        self.db = db
        self.pdf_generator = ReceiptPDFGenerator(logo_path or str(DEFAULT_LOGO_PATH))
        self.email_service = ReceiptEmailService()

    def create_receipt(self, quote: Quote) -> Quote:
        if not quote.company_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empresa não vinculada ao orçamento.",
            )

        company = self.db.get(Company, quote.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada.",
            )

        if not company.email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empresa não possui e-mail cadastrado.",
            )

        if self._has_receipt_for_current_approval(quote):
            return quote

        version = self._next_version(quote)
        quote.receipt_generated_at = datetime.now(UTC)
        quote.receipt_sent_at = None
        quote.receipt_pdf_url = None
        receipt_version = QuoteReceiptVersion(
            quote_id=quote.id,
            version=version,
            status=QuoteReceiptStatus.AVAILABLE.value,
            total_value=str(quote.total_value),
            approved_at=quote.approved_at,
            generated_at=quote.receipt_generated_at,
        )
        self.db.add(receipt_version)
        self._current_version = receipt_version

        try:
            pdf_bytes = self.pdf_generator.generate_receipt(
                quote, language_names=self._language_names()
            )
        except Exception as e:
            self._mark_error(quote, f"Erro ao gerar PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao gerar PDF do comprovante: {e}",
            ) from e

        try:
            quote.receipt_pdf_url = upload_receipt_pdf(
                filename=f"receipt_{quote.id}_v{version}.pdf",
                file_data=io.BytesIO(pdf_bytes),
                content_type="application/pdf",
            )
        except Exception as e:
            self._mark_error(quote, f"Erro ao fazer upload do PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao fazer upload do PDF: {e}",
            ) from e

        quote.receipt_status = QuoteReceiptStatus.AVAILABLE.value
        quote.receipt_error_message = None
        receipt_version.pdf_url = quote.receipt_pdf_url
        self.db.commit()

        try:
            self.email_service.send_quote_approved_email(
                to_email=company.email,
                quote_code=short_quote_code(quote.id),
                total_value=quote.total_value,
                approval_date=format_datetime_br(quote.approved_at),
                pdf_bytes=pdf_bytes,
                version=version,
            )
            quote.receipt_sent_at = datetime.now(UTC)
            quote.receipt_status = QuoteReceiptStatus.SENT.value
            receipt_version.sent_at = quote.receipt_sent_at
            receipt_version.status = QuoteReceiptStatus.SENT.value
        except Exception as e:
            quote.receipt_error_message = f"Erro ao enviar e-mail: {e}"
            receipt_version.error_message = quote.receipt_error_message

        self.db.commit()
        return quote

    def get_receipt(self, quote_id: uuid.UUID) -> Quote:
        quote = self.db.get(Quote, quote_id)
        if quote is None or quote.receipt_status is None:
            raise QuoteReceiptNotFoundError("Comprovante não encontrado para este orçamento.")
        return quote

    def list_versions(self, quote_id: uuid.UUID) -> list[QuoteReceiptVersion]:
        if self.db.get(Quote, quote_id) is None:
            raise QuoteReceiptNotFoundError("Orçamento não encontrado.")
        return (
            self.db.query(QuoteReceiptVersion)
            .filter(QuoteReceiptVersion.quote_id == quote_id)
            .order_by(QuoteReceiptVersion.version.desc())
            .all()
        )

    def _has_receipt_for_current_approval(self, quote: Quote) -> bool:
        if quote.receipt_status is None:
            return False
        if quote.receipt_generated_at is None or quote.approved_at is None:
            return True
        return quote.receipt_generated_at >= quote.approved_at

    def _next_version(self, quote: Quote) -> int:
        current = (
            self.db.query(QuoteReceiptVersion.version)
            .filter(QuoteReceiptVersion.quote_id == quote.id)
            .order_by(QuoteReceiptVersion.version.desc())
            .first()
        )
        return (current[0] if current else 0) + 1

    def _mark_error(self, quote: Quote, message: str) -> None:
        quote.receipt_status = QuoteReceiptStatus.ERROR.value
        quote.receipt_error_message = message
        current_version = getattr(self, "_current_version", None)
        if current_version is not None:
            current_version.status = QuoteReceiptStatus.ERROR.value
            current_version.error_message = message
        self.db.commit()

    def _language_names(self) -> dict[str, str]:
        return {language.id: language.name for language in self.db.query(Language).all()}
