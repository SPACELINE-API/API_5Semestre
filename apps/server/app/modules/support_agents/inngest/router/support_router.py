from fastapi import APIRouter, Depends

from app.modules.support_agents.inngest.schema.agent_schema import (
    SuporteAgenteEnfileiradoResponse,
    SuportePerguntaRequest,
    SuportePerguntaResponse,
)
from app.modules.support_agents.inngest.services.support_agent_services import (
    AgenteSuporteClient,
    enfileirar_teste_agente,
    get_agente_suporte,
    responder_pergunta_suporte,
)

router = APIRouter(prefix="/suporte", tags=["suporte"])


@router.post("/agente/teste", response_model=SuporteAgenteEnfileiradoResponse, status_code=201)
async def testar_agente(payload: SuportePerguntaRequest):
    return await enfileirar_teste_agente(payload)


@router.post("/perguntas", response_model=SuportePerguntaResponse, status_code=200)
async def criar_pergunta(
    payload: SuportePerguntaRequest,
    agente: AgenteSuporteClient = Depends(get_agente_suporte),
):
    return await responder_pergunta_suporte(payload, agente)
