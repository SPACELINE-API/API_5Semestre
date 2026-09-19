from datetime import date

from fastapi import HTTPException, status

from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.request import RequestCreate


class RequestService:
    def __init__(self, db):
        self.repo = RequestRepository(db)

    def list_all(self):
        return self.repo.list_all()

    def create(self, data: RequestCreate):
        last_request = self.repo.get_last_by_email(data.email)

        if last_request is not None:
            days_since_last_request = (date.today() - last_request.request_date).days
            if days_since_last_request < 7:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Você precisa aguardar no mínimo uma semana antes de enviar outra solicitação.",
                )

        return self.repo.create(data.model_dump())