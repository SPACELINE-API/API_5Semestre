from datetime import date

from fastapi import HTTPException, status

from app.modules.quotes.models.request import StatusEnum
from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.request import RequestCreate, RequestStatusUpdate


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

    def update_status(self, request_id, data: RequestStatusUpdate):
        request = self.repo.get_by_id(request_id)
        if request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requisição não encontrada.",
            )

        current_status = getattr(request.status, "value", request.status)
        if current_status == StatusEnum.APPROVED.value and data.status == StatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Uma requisição aprovada não pode voltar para pendente.",
            )

        if data.reason_is_required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O motivo é obrigatório ao reprovar uma requisição.",
            )

        return self.repo.update_status(request, data.status, data.reproval_reason)
