from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.auth.policies.policy import INACTIVITY_TIMEOUT_MINUTES
from app.modules.system_parameters.repositories.inactivity_timeout import (
    InactivityTimeoutRepository,
)
from app.modules.system_parameters.schemas.inactivity_timeout import (
    InactivityTimeoutResponse,
    InactivityTimeoutUpdate,
)


class InactivityTimeoutService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = InactivityTimeoutRepository(db)

    def get_inactivity_timeout(self) -> InactivityTimeoutResponse:
        parameter = self.repository.get_inactivity_timeout()

        if parameter is None:
            return InactivityTimeoutResponse(minutes=INACTIVITY_TIMEOUT_MINUTES)

        try:
            minutes = int(parameter.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tempo limite de inatividade configurado com valor inválido",
            ) from None

        return InactivityTimeoutResponse(minutes=minutes)

    def update_inactivity_timeout(
        self, payload: InactivityTimeoutUpdate
    ) -> InactivityTimeoutResponse:
        try:
            parameter = self.repository.update_value(payload.minutes)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível alterar o tempo limite de inatividade",
            ) from None

        return InactivityTimeoutResponse(minutes=int(parameter.value))
