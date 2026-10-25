from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro
from .listagem import montar_listagem

PERMISSAO_CONSULTAR_CLIENTES = "clients.read"


class ConsultarClientesEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(
        default="",
        max_length=100,
        description="Filtro parcial pelo nome fantasia ou razão social.",
    )
    apenas_ativos: bool = Field(default=False, description="Retorna apenas empresas ativas.")


class ClienteItem(BaseModel):
    id: str
    nome_fantasia: str | None = None
    razao_social: str | None = None
    cnpj: str | None = None
    segmento: str | None = None
    telefone: str | None = None
    email: str | None = None
    cidade: str | None = None
    estado: str | None = None
    ativo: bool | None = None


class ConsultarClientesSaida(BaseModel):
    itens: list[ClienteItem]
    truncado: bool


def consultar_clientes_spec(buscar: Callable[[str, bool], list[dict[str, Any]]]) -> ToolSpec:
    def handler(entrada: ConsultarClientesEntrada, usuario: Usuario) -> dict[str, Any]:
        return montar_listagem(buscar(entrada.nome, entrada.apenas_ativos))

    return ToolSpec(
        name="consultar_clientes",
        description=(
            "Consulta clientes e empresas cadastrados. Use quando o colaborador perguntar sobre "
            "dados de uma empresa cliente, CNPJ, segmento, contato, endereço ou status."
        ),
        input_schema=ConsultarClientesEntrada,
        output_schema=ConsultarClientesSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CONSULTAR_CLIENTES,
        handler=handler,
        topic_keywords=("cliente", "empresa", "cnpj"),
        topic_label="clientes",
    )
