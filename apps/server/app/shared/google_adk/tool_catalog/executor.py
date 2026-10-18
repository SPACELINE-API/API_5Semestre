import asyncio
import inspect
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from pydantic import BaseModel, ValidationError

from .contract import ToolSpec, Usuario
from .errors import CodigoErro, ResultadoFerramenta, erro, sucesso
from .permissions import usuario_pode
from .registry import Catalogo

logger = logging.getLogger(__name__)

Guardrails = Callable[[Usuario, ToolSpec, BaseModel], Awaitable[None]]


async def _chamar_handler(spec: ToolSpec, entrada: BaseModel, usuario: Usuario) -> Any:
    if inspect.iscoroutinefunction(spec.handler):
        return await spec.handler(entrada, usuario)
    return await asyncio.to_thread(spec.handler, entrada, usuario)


class Executor:
    def __init__(self, catalogo: Catalogo, guardrails: Guardrails) -> None:
        self._catalogo = catalogo
        self._guardrails = guardrails

    async def executar(self, nome: str, parametros: Any, usuario: Usuario) -> ResultadoFerramenta:
        spec = self._catalogo.buscar(nome)
        if spec is None:
            return erro(CodigoErro.FERRAMENTA_INDISPONIVEL)

        if not usuario_pode(usuario, spec):
            return erro(CodigoErro.SEM_PERMISSAO)

        if not isinstance(parametros, dict):
            return erro(CodigoErro.ENTRADA_INVALIDA)
        try:
            entrada = spec.input_schema.model_validate(parametros)
        except ValidationError:
            return erro(CodigoErro.ENTRADA_INVALIDA)

        try:
            await self._guardrails(usuario, spec, entrada)
        except Exception:
            logger.warning("Chamada bloqueada pelos guardrails: %s", spec.name, exc_info=True)
            return erro(CodigoErro.BLOQUEADO_GUARDRAIL)

        try:
            resultado = await _chamar_handler(spec, entrada, usuario)
            saida = spec.output_schema.model_validate(resultado, from_attributes=True)
            return sucesso(saida.model_dump(mode="json"))
        except Exception:
            logger.exception("Falha ao executar a ferramenta %s", spec.name)
            return erro(CodigoErro.ERRO_INTERNO)
