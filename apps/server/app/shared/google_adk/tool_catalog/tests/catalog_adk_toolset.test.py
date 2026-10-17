import asyncio
from types import SimpleNamespace

from app.shared.google_adk.tool_catalog import Executor
from app.shared.google_adk.tool_catalog.adk_toolset import (
    CatalogoToolset,
    FerramentaCatalogo,
    criar_toolset,
)
from app.shared.google_adk.tool_catalog.errors import CodigoErro

CONTEXTO = SimpleNamespace(user_id="colaborador@exemplo.com")


def _toolset(catalogo, guardrail, usuario):
    async def carregar(user_id):
        return usuario

    return CatalogoToolset(catalogo, Executor(catalogo, guardrail), carregar)


def _tools(toolset, contexto=CONTEXTO):
    return asyncio.run(toolset.get_tools(contexto))


def test_agente_recebe_somente_ferramentas_do_perfil(
    catalogo, guardrail_aprova, usuario_atendimento
):
    tools = _tools(_toolset(catalogo, guardrail_aprova, usuario_atendimento))
    assert [tool.name for tool in tools] == ["consultar_clientes"]


def test_agente_de_administrador_recebe_todas_as_ferramentas(
    catalogo, guardrail_aprova, usuario_admin
):
    tools = _tools(_toolset(catalogo, guardrail_aprova, usuario_admin))
    assert len(tools) == 5


def test_usuario_sem_permissao_nao_recebe_ferramenta_no_agente(
    catalogo, guardrail_aprova, usuario_sem_permissao
):
    assert _tools(_toolset(catalogo, guardrail_aprova, usuario_sem_permissao)) == []


def test_usuario_nao_encontrado_nao_recebe_ferramenta(catalogo, guardrail_aprova):
    assert _tools(_toolset(catalogo, guardrail_aprova, None)) == []


def test_sem_contexto_nao_recebe_ferramenta(catalogo, guardrail_aprova, usuario_admin):
    assert _tools(_toolset(catalogo, guardrail_aprova, usuario_admin), contexto=None) == []


def test_falha_ao_carregar_usuario_nao_recebe_ferramenta(catalogo, guardrail_aprova):
    async def carregar(user_id):
        raise RuntimeError("banco indisponível")

    toolset = CatalogoToolset(catalogo, Executor(catalogo, guardrail_aprova), carregar)
    assert _tools(toolset) == []


def test_declaracao_expoe_somente_o_schema_do_catalogo(
    catalogo, guardrail_aprova, usuario_atendimento
):
    tool = _tools(_toolset(catalogo, guardrail_aprova, usuario_atendimento))[0]
    declaracao = tool._get_declaration()
    assert declaracao.name == "consultar_clientes"
    assert set(declaracao.parameters_json_schema["properties"]) == {"nome", "apenas_ativos"}


def test_execucao_pelo_agente_retorna_resultado_do_contrato(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    tool = _tools(_toolset(catalogo, guardrail_aprova, usuario_atendimento))[0]
    resultado = asyncio.run(tool.run_async(args={"nome": "Acme"}, tool_context=None))
    assert resultado["sucesso"] is True
    assert set(resultado["dados"]) == {"itens", "truncado"}
    assert fontes.chamadas == [("clientes", ("Acme", False))]


def test_execucao_sem_permissao_pelo_agente_nao_consulta_dados(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    spec = catalogo.buscar("listar_usuarios")
    tool = FerramentaCatalogo(spec, Executor(catalogo, guardrail_aprova), usuario_atendimento)
    resultado = asyncio.run(tool.run_async(args={}, tool_context=None))
    assert resultado["sucesso"] is False
    assert resultado["erro"] == CodigoErro.SEM_PERMISSAO.value
    assert fontes.chamadas == []


def test_criar_toolset_monta_toolset_com_catalogo(catalogo, usuario_atendimento):
    async def carregar(user_id):
        return usuario_atendimento

    toolset = criar_toolset(catalogo, carregar_usuario=carregar)
    assert [tool.name for tool in _tools(toolset)] == ["consultar_clientes"]
