import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.repositories.quote_repository import QuoteRepository
from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.quote import QuoteCreate


class QuoteService:
    def __init__(self, db: Session):
        self.db = db
        self.quote_repository = QuoteRepository(db)
        self.request_repository = RequestRepository(db)

    def create_quote(self, quote_data: QuoteCreate) -> Quote:
        quote = Quote(status=quote_data.status)
        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)
        return quote

    def generate_from_approved_request(self, request_id: uuid.UUID) -> Quote:
        request = self.request_repository.get_by_id(request_id)
        if request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Requisição não encontrada."
            )

        request_status = getattr(request.status, "value", request.status)
        if request_status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A requisição precisa estar aprovada.",
            )

        if self.quote_repository.get_by_request_id(request_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um orçamento para esta requisição.",
            )

        required_fields = (
            request.customer_name,
            request.enterprise,
            request.email,
            request.original_language,
            request.translation_language,
            request.customer_need,
        )
        if any(not field or not field.strip() for field in required_fields):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A requisição possui dados obrigatórios inválidos.",
            )

        try:
            return self.quote_repository.create_from_request(request)
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível gerar o orçamento.",
            ) from None
