from collections.abc import Callable
from datetime import date, timedelta
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.modules.reports.permissions import PRODUCTIVITY_READ_PERMISSION

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro

PERMISSAO_CONSULTAR_PRODUTIVIDADE = PRODUCTIVITY_READ_PERMISSION


class ConsultarProdutividadeEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")
    periodo: Literal["", "mes_atual", "mes_passado", "ano_atual", "ano_passado"] | None = ""
    data_inicial: date | None = None
    data_final: date | None = None
    tradutor: str | None = ""
    ordem_servico: str | None = ""
    formato: Literal["", "csv", "xlsx"] | None = ""

    @field_validator("data_inicial", "data_final", mode="before")
    @classmethod
    def _vazio_vira_none(cls, valor):
        return None if valor == "" else valor


def _resolver_periodo(
    periodo: str, inicio: date | None, fim: date | None
) -> tuple[date | None, date | None]:
    hoje = date.today()
    if periodo == "mes_atual":
        return hoje.replace(day=1), hoje
    if periodo == "mes_passado":
        ultimo = hoje.replace(day=1) - timedelta(days=1)
        return ultimo.replace(day=1), ultimo
    if periodo == "ano_atual":
        return date(hoje.year, 1, 1), date(hoje.year, 12, 31)
    if periodo == "ano_passado":
        return date(hoje.year - 1, 1, 1), date(hoje.year - 1, 12, 31)
    return inicio, fim


class IndicadoresSaida(BaseModel):
    documentos_traduzidos: int
    total_palavras: int
    valor_total: str
    quantidade_ordens_servico: int
    concluidos_no_prazo: int
    concluidos_fora_do_prazo: int
    percentual_no_prazo: float | None = None
    tempo_medio_execucao_dias: float | None = None


class TradutorSaida(IndicadoresSaida):
    tradutor: str


class ConsultarProdutividadeSaida(BaseModel):
    periodo_inicio: str | None = None
    periodo_fim: str | None = None
    resumo: IndicadoresSaida | None = None
    tradutores: list[TradutorSaida] = []
    erro: str | None = None
    opcoes: list[str] = []
    arquivo_nome: str | None = None
    arquivo_url: str | None = None


def consultar_produtividade_spec(
    buscar: Callable[[date | None, date | None, str, str, str], dict[str, Any]],
) -> ToolSpec:
    def handler(entrada: ConsultarProdutividadeEntrada, usuario: Usuario) -> dict[str, Any]:
        inicio, fim = _resolver_periodo(
            entrada.periodo or "", entrada.data_inicial, entrada.data_final
        )
        return buscar(
            inicio,
            fim,
            entrada.tradutor or "",
            entrada.ordem_servico or "",
            entrada.formato or "",
        )

    return ToolSpec(
        name="consultar_produtividade",
        description=(
            "Gera o relatório de produtividade. Use para produtividade do mês, desempenho de "
            "um tradutor ou relatório de uma ordem de serviço em um período. "
            "Para 'este mês' use periodo=mes_atual; para 'mês passado' use periodo=mes_passado; "
            "para 'este ano' ou 'de janeiro a dezembro' sem ano informado use periodo=ano_atual; "
            "para 'ano passado' use periodo=ano_passado. Só preencha data_inicial e data_final "
            "(YYYY-MM-DD) quando o usuário informar datas explícitas com ano. Sem período, deixe "
            "tudo vazio. Se o usuário pedir planilha, Excel ou exportação, use formato=xlsx; "
            "se pedir CSV, use formato=csv. Apresente somente os valores retornados, sem "
            "recalcular. Se o retorno trouxer 'erro' e 'opcoes', peça ao usuário para escolher "
            "entre as opções. Se trouxer 'arquivo_url', mostre o link como [Baixar relatório]."
        ),
        input_schema=ConsultarProdutividadeEntrada,
        output_schema=ConsultarProdutividadeSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CONSULTAR_PRODUTIVIDADE,
        handler=handler,
        topic_keywords=("produtividade",),
        topic_label="produtividade",
    )
