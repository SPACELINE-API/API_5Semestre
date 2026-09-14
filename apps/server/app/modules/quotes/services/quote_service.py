from sqlalchemy.orm import Session
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.schemas.quote import QuoteCreate

class QuoteService:
    def __init__(self, db: Session):
        self.db = db

    def create_quote(self, quote_data: QuoteCreate) -> Quote:
        quote = Quote(status=quote_data.status)
        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)
        return quote
