from typing import Any

from pydantic import BaseModel, field_validator

MIN_INACTIVITY_TIMEOUT_MINUTES = 1
MAX_INACTIVITY_TIMEOUT_MINUTES = 1440


class InactivityTimeoutResponse(BaseModel):
    minutes: int


class InactivityTimeoutUpdate(BaseModel):
    minutes: int

    @field_validator("minutes", mode="before")
    @classmethod
    def validate_minutes(cls, value: Any) -> int:
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("O tempo limite de inatividade deve ser um número inteiro de minutos")

        if not MIN_INACTIVITY_TIMEOUT_MINUTES <= value <= MAX_INACTIVITY_TIMEOUT_MINUTES:
            raise ValueError(
                "O tempo limite de inatividade deve estar entre "
                f"{MIN_INACTIVITY_TIMEOUT_MINUTES} e {MAX_INACTIVITY_TIMEOUT_MINUTES} minutos"
            )

        return value
