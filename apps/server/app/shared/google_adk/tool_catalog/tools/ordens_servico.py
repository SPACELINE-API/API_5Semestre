from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro
from .listagem import montar_listagem

PERMISSAO_CONSULTAR_ORDENS_SERVICO = "service_orders.read"


class ConsultarOrdensServicoEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome_projeto: str = Field(
        default="", max_length=100, description="Filtro parcial pelo nome do projeto."
    )


class OrdemServicoItem(BaseModel):
    id: str
    nome_projeto: str | None = None
    prazo: str | None = None
    cliente: str | None = None
    quantidade_itens: int = 0


class ConsultarOrdensServicoSaida(BaseModel):
    itens: list[OrdemServicoItem]
    truncado: bool


def consultar_ordens_servico_spec(buscar: Callable[[str], list[dict[str, Any]]]) -> ToolSpec:
    def handler(entrada: ConsultarOrdensServicoEntrada, usuario: Usuario) -> dict[str, Any]:
        return montar_listagem(buscar(entrada.nome_projeto))

    return ToolSpec(
        name="consultar_ordens_servico",
        description=(
            "Consulta ordens de serviço (projetos de tradução). Use quando o colaborador "
            "perguntar sobre status de um projeto, prazo de entrega ou qual empresa solicitou."
        ),
        input_schema=ConsultarOrdensServicoEntrada,
        output_schema=ConsultarOrdensServicoSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CONSULTAR_ORDENS_SERVICO,
        handler=handler,
        topic_keywords=("ordem de servico", "ordens de servico", "projeto", "prazo de entrega"),
        topic_label="ordens de serviço",
    )
