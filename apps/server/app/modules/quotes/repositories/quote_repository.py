import uuid

from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session, selectinload

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request
from app.modules.quotes.models.translation_item import QuoteTranslationItem


class QuoteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_request_id(self, request_id: uuid.UUID) -> Quote | None:
        return self.db.query(Quote).filter(Quote.request_id == request_id).first()

    def list_all(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[Quote], int]:
        query = self.db.query(Quote)
        if status:
            query = query.filter(Quote.status == status)
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.outerjoin(QuoteTranslationItem, QuoteTranslationItem.quote_id == Quote.id)
            query = query.filter(
                or_(
                    cast(Quote.id, String).ilike(term),
                    Quote.customer_name.ilike(term),
                    Quote.enterprise.ilike(term),
                    Quote.email.ilike(term),
                    Quote.customer_need.ilike(term),
                    QuoteTranslationItem.document_type.ilike(term),
                )
            )

        total = query.with_entities(func.count(func.distinct(Quote.id))).scalar() or 0
        quotes = (
            query.options(selectinload(Quote.items), selectinload(Quote.service_orders))
            .distinct()
            .order_by(Quote.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return quotes, total

    def create_from_request(self, request: Request) -> Quote:
        quote = Quote(
            request_id=request.id,
            company_id=request.company_id,
            contact_id=request.contact_id,
            status="pending",
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
