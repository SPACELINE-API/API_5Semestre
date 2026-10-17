import logging
from typing import Any

from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools import BaseTool
from google.adk.tools.base_toolset import BaseToolset
from google.adk.tools.tool_context import ToolContext
from google.genai import types

from .adk_usuario import carregar_usuario_por_email
from .contract import CarregarUsuario, ToolSpec, Usuario
from .executor import Executor, Guardrails
from .guardrail_adapter import guardrail_entrada
from .permissions import ferramentas_permitidas
from .registry import Catalogo

logger = logging.getLogger(__name__)


class FerramentaCatalogo(BaseTool):
    def __init__(self, spec: ToolSpec, executor: Executor, usuario: Usuario) -> None:
        super().__init__(name=spec.name, description=spec.description)
        self._spec = spec
        self._executor = executor
        self._usuario = usuario

    def _get_declaration(self) -> types.FunctionDeclaration:
        return types.FunctionDeclaration(
            name=self._spec.name,
            description=self._spec.description,
            parameters_json_schema=self._spec.input_schema.model_json_schema(),
        )

    async def run_async(self, *, args: dict[str, Any], tool_context: ToolContext) -> Any:
        resultado = await self._executor.executar(self._spec.name, args, self._usuario)
        return resultado.model_dump(mode="json")


class CatalogoToolset(BaseToolset):
    def __init__(
        self,
        catalogo: Catalogo,
        executor: Executor,
        carregar_usuario: CarregarUsuario,
    ) -> None:
        super().__init__()
        self._catalogo = catalogo
        self._executor = executor
        self._carregar_usuario = carregar_usuario

    async def get_tools(self, readonly_context: ReadonlyContext | None = None) -> list[BaseTool]:
        if readonly_context is None:
            return []
        try:
            usuario = await self._carregar_usuario(readonly_context.user_id)
        except Exception:
            logger.exception("Falha ao carregar o usuário para o catálogo de ferramentas")
            return []
        if usuario is None:
            return []
        return [
            FerramentaCatalogo(spec, self._executor, usuario)
            for spec in ferramentas_permitidas(self._catalogo, usuario)
        ]

    async def close(self) -> None:
        return None


async def _carregar_usuario_padrao(email: str) -> Usuario | None:
    return await carregar_usuario_por_email(email)


def criar_toolset(
    catalogo: Catalogo,
    guardrails: Guardrails = guardrail_entrada,
    carregar_usuario: CarregarUsuario = _carregar_usuario_padrao,
) -> CatalogoToolset:
    return CatalogoToolset(catalogo, Executor(catalogo, guardrails), carregar_usuario)
