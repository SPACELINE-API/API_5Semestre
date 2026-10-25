from fastapi import APIRouter, Depends

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.support_agents.inngest.schema.agent_schema import (
    SuporteAgenteEnfileiradoResponse,
    SuportePerguntaRequest,
    SuportePerguntaResponse,
)
from app.modules.support_agents.inngest.services.support_agent_services import (
    AgenteSuporteClient,
    consultar_status_pergunta,
    enfileirar_pergunta_chat,
    enfileirar_teste_agente,
    get_agente_suporte,
    responder_pergunta_suporte,
)

router = APIRouter(prefix="/suporte", tags=["suporte"])
support_read_permission = require_permission("support.read")
support_write_permission = require_permission("support.write")


@router.post("/agente/teste", response_model=SuporteAgenteEnfileiradoResponse, status_code=201)
async def testar_agente(
    payload: SuportePerguntaRequest,
    _user=Depends(support_write_permission),
):
    return await enfileirar_teste_agente(payload)


@router.post("/perguntas", response_model=SuportePerguntaResponse, status_code=200)
async def criar_pergunta(
    payload: SuportePerguntaRequest,
    current_user=Depends(support_write_permission),
    agente: AgenteSuporteClient = Depends(get_agente_suporte),
):
    return await responder_pergunta_suporte(payload, agente, user_id=current_user.email)


@router.post("/chat", status_code=201)
async def criar_pergunta_chat(
    payload: SuportePerguntaRequest,
    current_user=Depends(support_write_permission),
):
    return await enfileirar_pergunta_chat(payload, user_id=current_user.email)


@router.get("/chat/{event_id}/status")
async def status_pergunta_chat(
    event_id: str,
    _user=Depends(support_read_permission),
):
    return await consultar_status_pergunta(event_id)
