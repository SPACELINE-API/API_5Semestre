import logging
from typing import Protocol

import inngest
from fastapi import HTTPException, status

from app.modules.support_agents.inngest.schema.agent_schema import (
    SuporteAgenteEnfileiradoResponse,
    SuportePerguntaRequest,
    SuportePerguntaResponse,
)
from app.shared.inngest.client import inngest_client

logger = logging.getLogger(__name__)


class AgenteSuporteClient(Protocol):
    async def __call__(self, texto: str) -> str: ...


async def enviar_para_agente_stub(texto: str) -> str:
    logger.info("Enviando mensagem ao colaborador")
    return f"resposta: {texto}"


def get_agente_suporte() -> AgenteSuporteClient:
    return enviar_para_agente_stub


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
