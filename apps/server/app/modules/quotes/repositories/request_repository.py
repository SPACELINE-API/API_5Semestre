import uuid

from sqlalchemy.orm import Session

from app.modules.quotes.models.request import Request

class RequestRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, request_id: uuid.UUID) -> Request | None:
        return self.db.get(Request, request_id)

    def list_all(self) -> list[Request]:
        return self.db.query(Request).all()

    def create(self, data: dict) -> Request:
        request = Request(**data)
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request