
import logging
from typing import Protocol

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.support_agents.inngest.schema.agent_schema import SuportePerguntaRequest, SuportePerguntaResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/suporte", tags=["suporte"])


class AgenteSuporteClient(Protocol):

    async def __call__(self, texto: str) -> str:
        ...


async def enviar_para_agente_stub(texto: str) -> str:
    logger.info("Enviando mensagem ao colaborador")
    return f"resposta: {texto}"


def get_agente_suporte() -> AgenteSuporteClient:
    return enviar_para_agente_stub


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
    except Exception:
        logger.exception("Falha ao obter resposta do agente de suporte")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O agente de suporte está indisponível no momento. Tente novamente em instantes.",
        )

    return SuportePerguntaResponse(resposta=resposta_texto)
