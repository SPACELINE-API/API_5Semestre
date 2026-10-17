from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel


class CodigoErro(StrEnum):
    FERRAMENTA_INDISPONIVEL = "FERRAMENTA_INDISPONIVEL"
    SEM_PERMISSAO = "SEM_PERMISSAO"
    BLOQUEADO_GUARDRAIL = "BLOQUEADO_GUARDRAIL"
    ENTRADA_INVALIDA = "ENTRADA_INVALIDA"
    ERRO_INTERNO = "ERRO_INTERNO"


MENSAGENS = {
    CodigoErro.FERRAMENTA_INDISPONIVEL: "Ferramenta indisponível.",
    CodigoErro.SEM_PERMISSAO: "Você não tem permissão para esta ação.",
    CodigoErro.BLOQUEADO_GUARDRAIL: "A solicitação foi bloqueada.",
    CodigoErro.ENTRADA_INVALIDA: "Os dados informados são inválidos.",
    CodigoErro.ERRO_INTERNO: "Não foi possível concluir a ação.",
}


class ErroFerramenta(BaseModel):
    sucesso: Literal[False] = False
    erro: CodigoErro
    mensagem: str


class SucessoFerramenta(BaseModel):
    sucesso: Literal[True] = True
    dados: dict[str, Any]


ResultadoFerramenta = SucessoFerramenta | ErroFerramenta


def erro(codigo: CodigoErro) -> ErroFerramenta:
    return ErroFerramenta(erro=codigo, mensagem=MENSAGENS[codigo])


def sucesso(dados: dict[str, Any]) -> SucessoFerramenta:
    return SucessoFerramenta(dados=dados)
