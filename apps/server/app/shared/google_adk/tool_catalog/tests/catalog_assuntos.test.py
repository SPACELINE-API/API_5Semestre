import asyncio

import pytest

from app.shared.google_adk.tool_catalog.permissions import assuntos_negados
from app.shared.google_adk.tool_catalog.verificacao_previa import (
    AssuntoNaoPermitido,
    UsuarioNaoAutorizado,
    verificar_assunto,
)


def _negados(catalogo, usuario, texto):
    return [spec.name for spec in assuntos_negados(catalogo, usuario, texto)]


@pytest.mark.parametrize(
    "texto",
    [
        "Quero a lista de tradutores",
        "me mostre os TRADUTORES cadastrados",
        "qual o telefone do tradutor Maria?",
        "Preciso do contato de um tradutór",
    ],
)
def test_atendente_nao_pode_perguntar_sobre_tradutores(catalogo, usuario_atendimento, texto):
    assert _negados(catalogo, usuario_atendimento, texto) == ["consultar_tradutores"]


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("liste os usuários do sistema", "listar_usuarios"),
        ("quais orçamentos estão pendentes?", "consultar_orcamentos"),
        ("qual o prazo de entrega do projeto Contrato?", "consultar_ordens_servico"),
        ("mostre as ordens de serviço", "consultar_ordens_servico"),
    ],
)
def test_atendente_nao_pode_perguntar_sobre_outros_assuntos_restritos(
    catalogo, usuario_atendimento, texto, esperado
):
    assert _negados(catalogo, usuario_atendimento, texto) == [esperado]


def test_atendente_pode_perguntar_sobre_clientes(catalogo, usuario_atendimento):
    assert _negados(catalogo, usuario_atendimento, "qual o CNPJ do cliente Acme?") == []


def test_pergunta_mista_com_assunto_permitido_nao_e_bloqueada_na_entrada(
    catalogo, usuario_atendimento
):
    texto = "qual o telefone do cliente Acme e do tradutor dele?"
    assert _negados(catalogo, usuario_atendimento, texto) == []


def test_pergunta_sem_assunto_conhecido_nao_e_bloqueada(catalogo, usuario_atendimento):
    assert _negados(catalogo, usuario_atendimento, "olá, tudo bem?") == []


def test_administrador_nunca_e_bloqueado(catalogo, usuario_admin):
    assert _negados(catalogo, usuario_admin, "liste tradutores, usuários e orçamentos") == []


def test_usuario_inativo_e_bloqueado_nos_assuntos_mencionados(catalogo, criar_role, criar_usuario):
    usuario = criar_usuario([criar_role("Administrador")], is_active=False)
    assert _negados(catalogo, usuario, "liste os clientes") == ["consultar_clientes"]


def test_palavra_parecida_nao_dispara_bloqueio(catalogo, usuario_atendimento):
    assert _negados(catalogo, usuario_atendimento, "isso é intradutível") == []


def _verificar(catalogo, usuario, texto):
    async def carregar(user_id):
        return usuario

    asyncio.run(verificar_assunto(texto, "x@exemplo.com", catalogo, carregar))


def test_verificar_assunto_levanta_assunto_nao_permitido(catalogo, usuario_atendimento):
    with pytest.raises(AssuntoNaoPermitido) as erro:
        _verificar(catalogo, usuario_atendimento, "lista de tradutores")
    assert erro.value.assuntos == ["tradutores"]


def test_verificar_assunto_permite_assunto_autorizado(catalogo, usuario_atendimento):
    _verificar(catalogo, usuario_atendimento, "lista de clientes")


def test_verificar_assunto_sem_usuario_levanta_erro(catalogo):
    with pytest.raises(UsuarioNaoAutorizado):
        _verificar(catalogo, None, "lista de clientes")
