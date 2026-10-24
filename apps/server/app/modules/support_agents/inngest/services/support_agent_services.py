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
from app.shared.google_adk.guardrail import (
    GuardrailUnavailable,
    PromptInjectionBlocked,
    TopicRestrictionBlocked,
    acheck_input,
)
from app.shared.google_adk.tool_catalog.catalogo_tarefas import obter_catalogo_tarefas
from app.shared.google_adk.tool_catalog.verificacao_previa import (
    AssuntoNaoPermitido,
    UsuarioNaoAutorizado,
    verificar_assunto,
)
from app.shared.inngest.client import inngest_client
from app.shared.inngest.functions import run_support_agent

logger = logging.getLogger(__name__)

INNGEST_DEV_URL = os.getenv("INNGEST_BASE_URL", "http://localhost:8288")


class AgenteSuporteClient(Protocol):
    async def __call__(self, texto: str, user_id: str | None = None) -> str: ...


async def validar_entrada(texto: str) -> None:
    """Bloqueia prompt injection e assuntos fora do escopo antes do Inngest/agente."""
    try:
        await acheck_input(texto)
    except PromptInjectionBlocked as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mensagem não permitida. Reformule seu pedido sobre o suporte do sistema.",
        ) from exc
    except TopicRestrictionBlocked as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Só consigo ajudar com assuntos do suporte: clientes, ordens de serviço, "
                "tradutores, orçamentos e usuários."
            ),
        ) from exc
    except GuardrailUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar sua mensagem agora. Tente novamente em instantes.",
        ) from exc


async def validar_permissao_assunto(texto: str, user_id: str | None) -> None:
    if user_id is None:
        return
    try:
        await verificar_assunto(texto, user_id, obter_catalogo_tarefas())
    except AssuntoNaoPermitido as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Você não tem permissão para consultar {', '.join(exc.assuntos)}.",
        ) from exc
    except UsuarioNaoAutorizado as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem permissão para esta operação.",
        ) from exc
    except Exception as exc:
        logger.exception("Falha ao validar as permissões do usuário")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar suas permissões agora. Tente novamente em instantes.",
        ) from exc


async def enviar_para_agente(texto: str, user_id: str | None = None) -> str:
    return await run_support_agent(texto, user_id=user_id or "chat-support")


def get_agente_suporte() -> AgenteSuporteClient:
    return enviar_para_agente


async def enfileirar_teste_agente(
    payload: SuportePerguntaRequest,
) -> SuporteAgenteEnfileiradoResponse:
    await validar_entrada(payload.texto)
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
    user_id: str | None = None,
) -> SuportePerguntaResponse:
    await validar_entrada(payload.texto)
    await validar_permissao_assunto(payload.texto, user_id)
    try:
        if user_id is None:
            resposta = await agente(payload.texto)
        else:
            resposta = await agente(payload.texto, user_id)
    except Exception as exc:
        logger.exception("Falha ao obter resposta do agente de suporte")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O agente de suporte está indisponível no momento. Tente novamente em instantes.",
        ) from exc
    return SuportePerguntaResponse(resposta=resposta)


async def enfileirar_pergunta_chat(
    payload: SuportePerguntaRequest, user_id: str | None = None
) -> dict:
    await validar_entrada(payload.texto)
    await validar_permissao_assunto(payload.texto, user_id)
    event_name = "support/chat.ask"
    dados = {"texto": payload.texto}
    if user_id is not None:
        dados["user_id"] = user_id
    try:
        ids = await inngest_client.send(inngest.Event(name=event_name, data=dados))
    except Exception as exc:
        logger.exception("Falha ao publicar pergunta no Inngest")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível enviar sua pergunta.",
        ) from exc
    return {"event_id": ids[0]}


async def consultar_status_pergunta(event_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.get(f"{INNGEST_DEV_URL}/v1/events/{event_id}/runs")
            response.raise_for_status()
            body = response.json()
    except httpx.ConnectTimeout:
        logger.warning("Timeout ao conectar no Inngest Dev Server (%s)", INNGEST_DEV_URL)
        return {"status": "pending"}  # trata como "ainda processando" em vez de quebrar
    except httpx.HTTPStatusError as exc:
        return {"status": "error", "error": f"Erro HTTP {exc.response.status_code}"}

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
