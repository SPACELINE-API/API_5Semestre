import io
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.quote_receipts.models.quote_receipt import QuoteReceipt
from app.modules.quote_receipts.repositories.quote_receipt_repository import QuoteReceiptRepository
from app.modules.quote_receipts.schemas.quote_receipt import QuoteReceiptStatus
from app.modules.quote_receipts.services.email_service import EmailService
from app.modules.quote_receipts.services.formatting import format_datetime_br, short_quote_code
from app.modules.quote_receipts.services.pdf_generator import PDFGenerator
from app.modules.quote_receipts.services.storage import upload_receipt_pdf
from app.modules.quotes.models.quote import Quote
from app.modules.system_parameters.models.language import Language

DEFAULT_LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo-alianca.png"


class QuoteReceiptNotFoundError(Exception):
    pass


class QuoteReceiptService:
    def __init__(self, db: Session, logo_path: str | None = None):
        self.db = db
        self.repository = QuoteReceiptRepository(db)
        self.pdf_generator = PDFGenerator(logo_path or str(DEFAULT_LOGO_PATH))
        self.email_service = EmailService()

    def create_receipt(self, quote: Quote) -> QuoteReceipt:
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

        existing_receipt = self.repository.get_by_quote_id(quote.id)
        if existing_receipt:
            return existing_receipt

        receipt = QuoteReceipt(
            quote_id=quote.id,
            company_id=quote.company_id,
            status=QuoteReceiptStatus.AVAILABLE.value,
        )

        try:
            pdf_bytes = self.pdf_generator.generate_receipt(
                quote, language_names=self._language_names()
            )
        except Exception as e:
            receipt.status = QuoteReceiptStatus.ERROR.value
            receipt.error_message = f"Erro ao gerar PDF: {str(e)}"
            self.repository.create(receipt)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao gerar PDF do comprovante: {str(e)}",
            ) from e

        try:
            pdf_buffer = io.BytesIO(pdf_bytes)
            pdf_url = upload_receipt_pdf(
                filename=f"receipt_{quote.id}.pdf",
                file_data=pdf_buffer,
                content_type="application/pdf",
            )
            receipt.pdf_url = pdf_url
        except Exception as e:
            receipt.status = QuoteReceiptStatus.ERROR.value
            receipt.error_message = f"Erro ao fazer upload do PDF: {str(e)}"
            self.repository.create(receipt)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao fazer upload do PDF: {str(e)}",
            ) from e

        receipt = self.repository.create(receipt)

        try:
            self.email_service.send_quote_approved_email(
                to_email=company.email,
                quote_code=short_quote_code(quote.id),
                total_value=quote.total_value,
                approval_date=format_datetime_br(quote.approved_at),
                pdf_bytes=pdf_bytes,
            )
            receipt.sent_at = datetime.now(UTC)
            receipt.status = QuoteReceiptStatus.SENT.value
            receipt.error_message = None
            self.repository.update(receipt)
        except Exception as e:
            receipt.error_message = f"Erro ao enviar e-mail: {str(e)}"
            self.repository.update(receipt)

        return receipt

    def _language_names(self) -> dict[str, str]:
        return {language.id: language.name for language in self.db.query(Language).all()}

    def get_by_quote_id(self, quote_id: uuid.UUID) -> QuoteReceipt:
        receipt = self.repository.get_by_quote_id(quote_id)
        if not receipt:
            raise QuoteReceiptNotFoundError("Comprovante não encontrado para este orçamento.")
        return receipt

    def get_by_id(self, receipt_id: uuid.UUID) -> QuoteReceipt:
        receipt = self.repository.get_by_id(receipt_id)
        if not receipt:
            raise QuoteReceiptNotFoundError("Comprovante não encontrado.")
        return receipt
