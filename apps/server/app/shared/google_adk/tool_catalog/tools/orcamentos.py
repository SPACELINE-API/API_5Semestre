from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro
from .listagem import montar_listagem

PERMISSAO_CONSULTAR_ORCAMENTOS = "quotes.read"


class ConsultarOrcamentosEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ItemOrcamento(BaseModel):
    tipo_documento: str | None = None
    idioma_origem: str | None = None
    idioma_destino: str | None = None
    valor_estimado: str | None = None


class OrcamentoItem(BaseModel):
    id: str
    status: str | None = None
    itens: list[ItemOrcamento] = []


class ConsultarOrcamentosSaida(BaseModel):
    itens: list[OrcamentoItem]
    truncado: bool


def consultar_orcamentos_spec(buscar: Callable[[], list[dict[str, Any]]]) -> ToolSpec:
    def handler(entrada: ConsultarOrcamentosEntrada, usuario: Usuario) -> dict[str, Any]:
        return montar_listagem(buscar())

    return ToolSpec(
        name="consultar_orcamentos",
        description=(
            "Consulta orçamentos. Use quando o colaborador perguntar sobre orçamentos aprovados, "
            "pendentes ou valores estimados de tradução."
        ),
        input_schema=ConsultarOrcamentosEntrada,
        output_schema=ConsultarOrcamentosSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CONSULTAR_ORCAMENTOS,
        handler=handler,
        topic_keywords=("orcamento", "cotacao"),
        topic_label="orçamentos",
    )
