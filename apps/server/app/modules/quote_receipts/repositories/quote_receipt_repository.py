import uuid

from sqlalchemy.orm import Session

from app.modules.quote_receipts.models.quote_receipt import QuoteReceipt


class QuoteReceiptRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, receipt_id: uuid.UUID) -> QuoteReceipt | None:
        return self.db.get(QuoteReceipt, receipt_id)

    def get_by_quote_id(self, quote_id: uuid.UUID) -> QuoteReceipt | None:
        return self.db.query(QuoteReceipt).filter(QuoteReceipt.quote_id == quote_id).first()

    def create(self, receipt: QuoteReceipt) -> QuoteReceipt:
        self.db.add(receipt)
        self.db.commit()
        self.db.refresh(receipt)
        return receipt

    def update(self, receipt: QuoteReceipt) -> QuoteReceipt:
        self.db.commit()
        self.db.refresh(receipt)
        return receipt
