from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro
from .listagem import montar_listagem

PERMISSAO_LISTAR_USUARIOS = "users.read"


class ListarUsuariosEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(default="", max_length=255, description="Filtro parcial pelo e-mail.")
    role: str = Field(
        default="",
        max_length=50,
        description="Filtro exato pelo perfil, ex: admin, tradutor, cliente.",
    )
    apenas_ativos: bool = Field(default=False, description="Retorna apenas usuários ativos.")


class UsuarioItem(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: str | None = None


class ListarUsuariosSaida(BaseModel):
    itens: list[UsuarioItem]
    truncado: bool


def listar_usuarios_spec(buscar: Callable[[str, str, bool], list[dict[str, Any]]]) -> ToolSpec:
    def handler(entrada: ListarUsuariosEntrada, usuario: Usuario) -> dict[str, Any]:
        return montar_listagem(buscar(entrada.email, entrada.role, entrada.apenas_ativos))

    return ToolSpec(
        name="listar_usuarios",
        description=(
            "Lista usuários cadastrados no sistema. Use quando o colaborador pedir para ver, "
            "listar ou buscar usuários por e-mail, por perfil ou pelo status de ativação."
        ),
        input_schema=ListarUsuariosEntrada,
        output_schema=ListarUsuariosSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_LISTAR_USUARIOS,
        handler=handler,
        topic_keywords=("usuario",),
        topic_label="usuários",
    )
