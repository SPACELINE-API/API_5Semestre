import uuid

from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request


class QuoteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_request_id(self, request_id: uuid.UUID) -> Quote | None:
        return self.db.query(Quote).filter(Quote.request_id == request_id).first()

    def create_from_request(self, request: Request) -> Quote:
        quote = Quote(
            request_id=request.id,
            status="draft",
            customer_name=request.customer_name,
            enterprise=request.enterprise,
            email=request.email,
            original_language=request.original_language,
            translation_language=request.translation_language,
            customer_need=request.customer_need,
        )
        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)
        return quote
