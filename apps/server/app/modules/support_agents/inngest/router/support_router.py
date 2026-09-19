import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.support_agents.inngest.schema.agent_schema import (
    SuportePerguntaRequest,
    SuportePerguntaResponse,
)
from app.modules.support_agents.inngest.services.support_agent_services import (
    AgenteSuporteClient,
    get_agente_suporte,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/suporte", tags=["suporte"])


@router.post(
    "/perguntas",
    response_model=SuportePerguntaResponse,
    status_code=status.HTTP_200_OK,
)
async def criar_pergunta(
    payload: SuportePerguntaRequest,
    agente: AgenteSuporteClient = Depends(get_agente_suporte),
) -> SuportePerguntaResponse:
    try:
        resposta_texto = await agente(payload.texto)
    except Exception as exc:
        logger.exception("Falha ao obter resposta do agente de suporte")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O agente de suporte está indisponível no momento. Tente novamente em instantes.",
        ) from exc
    return SuportePerguntaResponse(resposta=resposta_texto)
