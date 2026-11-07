from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.modules.system_parameters.models.system_parameter import SystemParameter
from app.modules.system_parameters.repositories.inactivity_timeout import (
    INACTIVITY_TIMEOUT_KEY,
)
from app.modules.system_parameters.schemas.inactivity_timeout import InactivityTimeoutUpdate
from app.modules.system_parameters.services.inactivity_timeout import InactivityTimeoutService


def build_service(parameter: SystemParameter | None = None) -> InactivityTimeoutService:
    service = InactivityTimeoutService(MagicMock())
    service.repository = MagicMock()
    service.repository.get_inactivity_timeout.return_value = parameter
    return service


def test_returns_default_timeout_when_parameter_does_not_exist() -> None:
    service = build_service()

    assert service.get_inactivity_timeout().minutes == 30


def test_returns_stored_timeout_in_minutes() -> None:
    service = build_service(SystemParameter(key=INACTIVITY_TIMEOUT_KEY, value="45"))

    assert service.get_inactivity_timeout().minutes == 45


def test_raises_error_when_stored_timeout_is_invalid() -> None:
    service = build_service(SystemParameter(key=INACTIVITY_TIMEOUT_KEY, value="abc"))

    with pytest.raises(HTTPException) as error:
        service.get_inactivity_timeout()

    assert error.value.status_code == 500
    assert error.value.detail == "Tempo limite de inatividade configurado com valor inválido"


def test_updates_timeout() -> None:
    service = build_service()
    service.repository.update_value.return_value = SystemParameter(
        key=INACTIVITY_TIMEOUT_KEY, value="60"
    )

    response = service.update_inactivity_timeout(InactivityTimeoutUpdate(minutes=60))

    service.repository.update_value.assert_called_once_with(60)
    assert response.minutes == 60


def test_rolls_back_when_update_fails() -> None:
    service = build_service()
    service.repository.update_value.side_effect = SQLAlchemyError()

    with pytest.raises(HTTPException) as error:
        service.update_inactivity_timeout(InactivityTimeoutUpdate(minutes=60))

    service.db.rollback.assert_called_once()
    assert error.value.status_code == 500
    assert error.value.detail == "Não foi possível alterar o tempo limite de inatividade"


@pytest.mark.parametrize("minutes", [0, -5, 1441])
def test_rejects_timeout_out_of_range(minutes: int) -> None:
    with pytest.raises(ValidationError) as error:
        InactivityTimeoutUpdate(minutes=minutes)

    assert "O tempo limite de inatividade deve estar entre 1 e 1440 minutos" in str(error.value)


@pytest.mark.parametrize("minutes", ["30", 30.5, True, None])
def test_rejects_timeout_that_is_not_integer(minutes: object) -> None:
    with pytest.raises(ValidationError) as error:
        InactivityTimeoutUpdate(minutes=minutes)

    assert "O tempo limite de inatividade deve ser um número inteiro de minutos" in str(
        error.value
    )
