import logging
import os
from typing import Protocol

import httpx
import inngest
from fastapi import HTTPException, status

from app.modules.support_agents.inngest.schema.agent_schema import (
    SuporteAgenteEnfileiradoResponse,
    SuportePerguntaRequest,
    SuportePerguntaResponse,
)
from app.shared.inngest.client import inngest_client
from app.shared.inngest.functions import run_support_agent

logger = logging.getLogger(__name__)

INNGEST_DEV_URL = os.getenv("INNGEST_BASE_URL", "http://localhost:8288")


class AgenteSuporteClient(Protocol):
    async def __call__(self, texto: str) -> str: ...


async def enviar_para_agente(texto: str) -> str:
    return await run_support_agent(texto, user_id="chat-support")


def get_agente_suporte() -> AgenteSuporteClient:
    return enviar_para_agente


async def enfileirar_teste_agente(
    payload: SuportePerguntaRequest,
) -> SuporteAgenteEnfileiradoResponse:
    event_name = "support/agent.test"
    try:
        ids = await inngest_client.send(
            inngest.Event(name=event_name, data={"texto": payload.texto})
        )
    except Exception as exc:
        logger.exception("Falha ao publicar teste do agente no Inngest")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível enfileirar o teste do agente.",
        ) from exc
    return SuporteAgenteEnfileiradoResponse(status="queued", evento=event_name, ids=ids)


async def responder_pergunta_suporte(
    payload: SuportePerguntaRequest,
    agente: AgenteSuporteClient,
) -> SuportePerguntaResponse:
    try:
        resposta = await agente(payload.texto)
    except Exception as exc:
        logger.exception("Falha ao obter resposta do agente de suporte")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O agente de suporte está indisponível no momento. Tente novamente em instantes.",
        ) from exc
    return SuportePerguntaResponse(resposta=resposta)


async def enfileirar_pergunta_chat(payload: SuportePerguntaRequest) -> dict:
    event_name = "support/chat.ask"
    try:
        ids = await inngest_client.send(
            inngest.Event(name=event_name, data={"texto": payload.texto})
        )
    except Exception as exc:
        logger.exception("Falha ao publicar pergunta no Inngest")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível enviar sua pergunta.",
        ) from exc
    return {"event_id": ids[0]}


async def consultar_status_pergunta(event_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INNGEST_DEV_URL}/v1/events/{event_id}/runs")
        response.raise_for_status()
        body = response.json()

    runs = body.get("data", [])
    if not runs:
        return {"status": "pending"}

    run = runs[0]
    status_map = {
        "Completed": "completed",
        "Failed": "error",
        "Running": "pending",
        "Queued": "pending",
    }
    status_atual = status_map.get(run.get("status"), "pending")

    if status_atual == "completed":
        return {"status": "completed", "resposta": run.get("output", {}).get("resposta")}
    if status_atual == "error":
        return {"status": "error", "error": run.get("output")}
    return {"status": "pending"}
