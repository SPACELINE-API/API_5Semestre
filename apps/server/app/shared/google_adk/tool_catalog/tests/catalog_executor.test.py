import asyncio

from pydantic import BaseModel

from app.shared.google_adk.tool_catalog import Catalogo, Executor
from app.shared.google_adk.tool_catalog.contract import ToolSpec
from app.shared.google_adk.tool_catalog.errors import CodigoErro
from app.shared.google_adk.tool_catalog.tools import consultar_clientes_spec
from app.shared.google_adk.tool_catalog.tools.listagem import LIMITE_RESULTADOS


def executar(executor, nome, parametros, usuario):
    return asyncio.run(executor.executar(nome, parametros, usuario))


def _executor(catalogo, guardrail):
    return Executor(catalogo, guardrail)


def test_ferramenta_autorizada_executa_com_sucesso(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    resultado = executar(
        _executor(catalogo, guardrail_aprova),
        "consultar_clientes",
        {"nome": "Acme", "apenas_ativos": True},
        usuario_atendimento,
    )
    assert resultado.sucesso is True
    assert resultado.dados["truncado"] is False
    assert resultado.dados["itens"][0]["nome_fantasia"] == "Acme"
    assert fontes.chamadas == [("clientes", ("Acme", True))]


def test_ferramenta_sem_parametros_executa(catalogo, guardrail_aprova, usuario_projetos):
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_orcamentos", {}, usuario_projetos
    )
    assert resultado.sucesso is True
    assert resultado.dados["itens"][0]["itens"][0]["valor_estimado"] == "100.00"


def test_saida_descarta_campos_fora_do_schema(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    fontes.clientes = [{"id": "c1", "nome_fantasia": "Acme", "senha_interna": "x", "ativo": True}]
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_clientes", {}, usuario_atendimento
    )
    assert "senha_interna" not in resultado.dados["itens"][0]


def test_listagem_acima_do_limite_e_marcada_como_truncada(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    fontes.clientes = [{"id": str(i)} for i in range(LIMITE_RESULTADOS + 1)]
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_clientes", {}, usuario_atendimento
    )
    assert resultado.dados["truncado"] is True
    assert len(resultado.dados["itens"]) == LIMITE_RESULTADOS


def test_ferramenta_indisponivel_nao_chama_sistema(
    catalogo, guardrail_aprova, fontes, usuario_admin
):
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "apagar_cliente", {"id": "1"}, usuario_admin
    )
    assert resultado.erro == CodigoErro.FERRAMENTA_INDISPONIVEL
    assert fontes.chamadas == []


def test_ferramenta_nao_autorizada_nao_consulta_dados(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "listar_usuarios", {}, usuario_atendimento
    )
    assert resultado.sucesso is False
    assert resultado.erro == CodigoErro.SEM_PERMISSAO
    assert fontes.chamadas == []


def test_usuario_inativo_nao_consulta_dados(
    catalogo, guardrail_aprova, fontes, criar_role, criar_usuario
):
    usuario = criar_usuario([criar_role("Administrador")], is_active=False)
    resultado = executar(_executor(catalogo, guardrail_aprova), "listar_usuarios", {}, usuario)
    assert resultado.erro == CodigoErro.SEM_PERMISSAO
    assert fontes.chamadas == []


def test_guardrail_nao_executa_sem_autorizacao_nem_para_ferramenta_inexistente(
    catalogo, usuario_atendimento
):
    chamadas = []

    async def guardrail(usuario, spec, entrada):
        chamadas.append(spec.name)

    executor = _executor(catalogo, guardrail)
    executar(executor, "listar_usuarios", {}, usuario_atendimento)
    executar(executor, "inexistente", {}, usuario_atendimento)
    assert chamadas == []


def test_guardrail_reprova_chamada(catalogo, guardrail_bloqueia, fontes, usuario_atendimento):
    resultado = executar(
        _executor(catalogo, guardrail_bloqueia), "consultar_clientes", {}, usuario_atendimento
    )
    assert resultado.erro == CodigoErro.BLOQUEADO_GUARDRAIL
    assert fontes.chamadas == []


def test_guardrail_executa_antes_da_consulta(usuario_atendimento):
    ordem = []

    def buscar(nome, apenas_ativos):
        ordem.append("consulta")
        return []

    async def guardrail(usuario, spec, entrada):
        ordem.append("guardrail")
        assert isinstance(entrada, BaseModel)

    catalogo = Catalogo()
    catalogo.registrar(consultar_clientes_spec(buscar))
    executar(_executor(catalogo, guardrail), "consultar_clientes", {}, usuario_atendimento)
    assert ordem == ["guardrail", "consulta"]


def test_entrada_com_campo_nao_previsto(catalogo, guardrail_aprova, fontes, usuario_atendimento):
    resultado = executar(
        _executor(catalogo, guardrail_aprova),
        "consultar_clientes",
        {"nome": "Acme", "endpoint": "/admin/usuarios"},
        usuario_atendimento,
    )
    assert resultado.erro == CodigoErro.ENTRADA_INVALIDA
    assert fontes.chamadas == []


def test_entrada_com_tipo_incorreto(catalogo, guardrail_aprova, fontes, usuario_atendimento):
    resultado = executar(
        _executor(catalogo, guardrail_aprova),
        "consultar_clientes",
        {"nome": ["a"], "apenas_ativos": "talvez"},
        usuario_atendimento,
    )
    assert resultado.erro == CodigoErro.ENTRADA_INVALIDA
    assert fontes.chamadas == []


def test_entrada_acima_do_tamanho_maximo(catalogo, guardrail_aprova, fontes, usuario_atendimento):
    resultado = executar(
        _executor(catalogo, guardrail_aprova),
        "consultar_clientes",
        {"nome": "x" * 101},
        usuario_atendimento,
    )
    assert resultado.erro == CodigoErro.ENTRADA_INVALIDA
    assert fontes.chamadas == []


def test_parametros_que_nao_sao_objeto(catalogo, guardrail_aprova, fontes, usuario_atendimento):
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_clientes", "Acme", usuario_atendimento
    )
    assert resultado.erro == CodigoErro.ENTRADA_INVALIDA
    assert fontes.chamadas == []


def test_falha_na_consulta_retorna_erro_controlado(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    fontes.excecao = RuntimeError("password authentication failed for user postgres")
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_clientes", {}, usuario_atendimento
    )
    assert resultado.sucesso is False
    assert resultado.erro == CodigoErro.ERRO_INTERNO
    assert "postgres" not in resultado.mensagem


def test_saida_fora_do_schema_retorna_erro_controlado(
    catalogo, guardrail_aprova, fontes, usuario_atendimento
):
    fontes.clientes = [{"nome_fantasia": "sem id"}]
    resultado = executar(
        _executor(catalogo, guardrail_aprova), "consultar_clientes", {}, usuario_atendimento
    )
    assert resultado.erro == CodigoErro.ERRO_INTERNO


def test_handler_assincrono_e_suportado(criar_role, criar_usuario, guardrail_aprova):
    class Entrada(BaseModel):
        valor: int

    class Saida(BaseModel):
        dobro: int

    async def handler(entrada, usuario):
        return {"dobro": entrada.valor * 2}

    catalogo = Catalogo()
    catalogo.registrar(
        ToolSpec(
            name="dobrar",
            description="Dobra um valor.",
            input_schema=Entrada,
            output_schema=Saida,
            errors=(CodigoErro.ERRO_INTERNO,),
            required_permission="clients.read",
            handler=handler,
        )
    )
    usuario = criar_usuario([criar_role("Atendimento", "clients.read")])
    resultado = executar(_executor(catalogo, guardrail_aprova), "dobrar", {"valor": 4}, usuario)
    assert resultado.dados == {"dobro": 8}
