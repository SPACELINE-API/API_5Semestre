import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class AgenteSuporteClient(Protocol):
    async def __call__(self, texto: str) -> str: ...


async def enviar_para_agente_stub(texto: str) -> str:
    logger.info("Enviando mensagem ao colaborador")
    return f"resposta: {texto}"


def get_agente_suporte() -> AgenteSuporteClient:
    return enviar_para_agente_stub
