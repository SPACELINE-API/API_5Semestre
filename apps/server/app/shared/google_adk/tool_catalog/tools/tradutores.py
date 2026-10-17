from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro
from .listagem import montar_listagem

PERMISSAO_CONSULTAR_TRADUTORES = "translators.read"


class ConsultarTradutoresEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(default="", max_length=100, description="Filtro parcial pelo nome.")


class TradutorItem(BaseModel):
    id: str
    nome: str | None = None
    email: str | None = None
    telefone: str | None = None


class ConsultarTradutoresSaida(BaseModel):
    itens: list[TradutorItem]
    truncado: bool


def consultar_tradutores_spec(buscar: Callable[[str], list[dict[str, Any]]]) -> ToolSpec:
    def handler(entrada: ConsultarTradutoresEntrada, usuario: Usuario) -> dict[str, Any]:
        return montar_listagem(buscar(entrada.nome))

    return ToolSpec(
        name="consultar_tradutores",
        description=(
            "Consulta tradutores cadastrados. Use quando o colaborador perguntar sobre dados "
            "de contato de um tradutor ou quais tradutores estão no sistema."
        ),
        input_schema=ConsultarTradutoresEntrada,
        output_schema=ConsultarTradutoresSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CONSULTAR_TRADUTORES,
        handler=handler,
        topic_keywords=("tradutor",),
        topic_label="tradutores",
    )
