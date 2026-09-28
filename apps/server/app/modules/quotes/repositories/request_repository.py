import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.modules.quotes.models.request import Request, StatusEnum


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

    def get_last_by_email(self, email: str) -> Request | None:
        return (
            self.db.query(Request)
            .filter(Request.email == email)
            .order_by(Request.request_date.desc())
            .first()
        )

    def update_status(
        self, request: Request, status: StatusEnum, reproval_reason: str | None = None
    ) -> Request:
        request.status = status
        if getattr(status, "value", status) == "approved":
            request.approved_at = datetime.now(UTC)
            request.reproved_at = None
            request.reproval_reason = None
        elif getattr(status, "value", status) == "reproved":
            request.reproved_at = datetime.now(UTC)
            request.approved_at = None
            request.reproval_reason = reproval_reason
        self.db.commit()
        self.db.refresh(request)
        return request
