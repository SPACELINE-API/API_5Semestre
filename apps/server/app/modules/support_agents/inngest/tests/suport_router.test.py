import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.modules.support_agents.inngest.schema.agent_schema import QUESTION_MAX_LENGTH
from app.modules.support_agents.inngest.services.support_agent_services import get_agente_suporte

client = TestClient(app)

URL = "/api/suporte/perguntas"


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_valid_question_returns_200_with_agent_response():
    async def fake_agent(text: str) -> str:
        return "You can create a lead in Contacts > New lead."

    app.dependency_overrides[get_agente_suporte] = lambda: fake_agent

    response = client.post(URL, json={"texto": "How do I create a lead?"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"resposta": "You can create a lead in Contacts > New lead."}


def test_empty_question_is_rejected_without_calling_the_agent():
    calls = []

    async def fake_agent(text: str) -> str:
        calls.append(text)
        return "should not be called"

    app.dependency_overrides[get_agente_suporte] = lambda: fake_agent

    response = client.post(URL, json={"texto": ""})

    assert response.status_code in (
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    )
    assert calls == []


def test_question_above_limit_is_rejected_without_calling_the_agent():
    calls = []

    async def fake_agent(text: str) -> str:
        calls.append(text)
        return "should not be called"

    app.dependency_overrides[get_agente_suporte] = lambda: fake_agent

    text = "a" * (QUESTION_MAX_LENGTH + 1)
    response = client.post(URL, json={"texto": text})

    assert response.status_code in (
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    )
    assert calls == []


def test_unavailable_agent_returns_502_without_exposing_technical_detail():
    async def fake_agent(text: str) -> str:
        raise RuntimeError("provider is down")

    app.dependency_overrides[get_agente_suporte] = lambda: fake_agent

    response = client.post(URL, json={"texto": "How do I create a lead?"})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    body = response.json()
    assert "provider is down" not in body["detail"]
    assert "RuntimeError" not in body["detail"]