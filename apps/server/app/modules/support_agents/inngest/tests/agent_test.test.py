from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.modules.support_agents.inngest.services import support_agent_services
from app.shared.inngest.functions import (
    process_chat_message,
    process_support_ticket,
    support_agent_inngest_functions,
    test_support_agent,
)

client = TestClient(app)


def test_todas_as_functions_estao_registradas():
    assert test_support_agent in support_agent_inngest_functions
    assert process_chat_message in support_agent_inngest_functions
    assert process_support_ticket in support_agent_inngest_functions


def test_functions_tem_fn_id_unicos():
    fn_ids = [fn.id for fn in support_agent_inngest_functions]

    assert len(fn_ids) == len(set(fn_ids)), "Existem fn_id duplicados entre as functions"


def test_agente_teste_publica_evento_e_retorna_201(monkeypatch):
    async def fake_send(event):
        assert event.name == "support/agent.test"
        assert event.data == {"texto": "Olá, agente"}
        return ["event-test-123"]

    monkeypatch.setattr(support_agent_services.inngest_client, "send", fake_send)

    response = client.post("/api/suporte/agente/teste", json={"texto": "Olá, agente"})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json() == {
        "status": "queued",
        "evento": "support/agent.test",
        "ids": ["event-test-123"],
    }


def test_agente_teste_rejeita_texto_vazio():
    response = client.post("/api/suporte/agente/teste", json={"texto": ""})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_agente_teste_retorna_502_quando_inngest_falha(monkeypatch):
    async def fake_send_com_falha(event):
        raise RuntimeError("Inngest indisponível")

    monkeypatch.setattr(support_agent_services.inngest_client, "send", fake_send_com_falha)

    response = client.post("/api/suporte/agente/teste", json={"texto": "Olá"})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY


def test_criar_pergunta_chat_enfileira_evento_e_retorna_event_id(monkeypatch):
    async def fake_send(event):
        assert event.name == "support/chat.ask"
        assert event.data == {"texto": "Quais usuários estão cadastrados?"}
        return ["event-chat-123"]

    monkeypatch.setattr(support_agent_services.inngest_client, "send", fake_send)

    response = client.post("/api/suporte/chat", json={"texto": "Quais usuários estão cadastrados?"})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json() == {"event_id": "event-chat-123"}


def test_criar_pergunta_chat_rejeita_texto_vazio():
    response = client.post("/api/suporte/chat", json={"texto": ""})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_criar_pergunta_chat_retorna_502_quando_inngest_falha(monkeypatch):
    async def fake_send_com_falha(event):
        raise RuntimeError("Inngest indisponível")

    monkeypatch.setattr(support_agent_services.inngest_client, "send", fake_send_com_falha)

    response = client.post("/api/suporte/chat", json={"texto": "Oi"})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY


def _fake_async_client(mock_response):
    class FakeAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return mock_response

    return FakeAsyncClient()


@pytest.mark.asyncio
async def test_consultar_status_pergunta_completed(monkeypatch):
    mock_response = AsyncMock()
    mock_response.json = lambda: {
        "data": [{"status": "Completed", "output": {"resposta": "Temos 3 usuários."}}]
    }
    mock_response.raise_for_status = lambda: None

    monkeypatch.setattr(
        support_agent_services.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _fake_async_client(mock_response),
    )

    resultado = await support_agent_services.consultar_status_pergunta("event-chat-123")

    assert resultado == {"status": "completed", "resposta": "Temos 3 usuários."}


@pytest.mark.asyncio
async def test_consultar_status_pergunta_ainda_pendente(monkeypatch):
    mock_response = AsyncMock()
    mock_response.json = lambda: {"data": []}
    mock_response.raise_for_status = lambda: None

    monkeypatch.setattr(
        support_agent_services.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _fake_async_client(mock_response),
    )

    resultado = await support_agent_services.consultar_status_pergunta("event-chat-456")

    assert resultado == {"status": "pending"}


@pytest.mark.asyncio
async def test_consultar_status_pergunta_running_ainda_conta_como_pendente(monkeypatch):
    mock_response = AsyncMock()
    mock_response.json = lambda: {"data": [{"status": "Running", "output": None}]}
    mock_response.raise_for_status = lambda: None

    monkeypatch.setattr(
        support_agent_services.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _fake_async_client(mock_response),
    )

    resultado = await support_agent_services.consultar_status_pergunta("event-chat-789")

    assert resultado == {"status": "pending"}


@pytest.mark.asyncio
async def test_consultar_status_pergunta_com_falha(monkeypatch):
    mock_response = AsyncMock()
    mock_response.json = lambda: {
        "data": [{"status": "Failed", "output": {"error": "algo deu errado"}}]
    }
    mock_response.raise_for_status = lambda: None

    monkeypatch.setattr(
        support_agent_services.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _fake_async_client(mock_response),
    )

    resultado = await support_agent_services.consultar_status_pergunta("event-chat-999")

    assert resultado["status"] == "error"
