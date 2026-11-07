from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.system_parameters.models.system_parameter import SystemParameter

INACTIVITY_TIMEOUT_KEY = "inactivity_timeout_minutes"


class InactivityTimeoutRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_inactivity_timeout(self) -> SystemParameter | None:
        return self.db.scalar(
            select(SystemParameter).where(SystemParameter.key == INACTIVITY_TIMEOUT_KEY)
        )

    def update_value(self, minutes: int) -> SystemParameter:
        parameter = self.get_inactivity_timeout()

        if parameter is None:
            parameter = SystemParameter(key=INACTIVITY_TIMEOUT_KEY, value=str(minutes))
            self.db.add(parameter)
        else:
            parameter.value = str(minutes)

        self.db.commit()
        self.db.refresh(parameter)
        return parameter
