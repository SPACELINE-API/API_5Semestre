from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.modules.support_agents.inngest.services import support_agent_services

client = TestClient(app)


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

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
