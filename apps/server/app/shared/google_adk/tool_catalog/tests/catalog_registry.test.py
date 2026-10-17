import pytest

from app.shared.google_adk.tool_catalog import definicoes_para_agente, ferramentas_permitidas

TODAS = {
    "listar_usuarios",
    "consultar_clientes",
    "consultar_ordens_servico",
    "consultar_tradutores",
    "consultar_orcamentos",
}


def _nomes(catalogo, usuario):
    return {spec.name for spec in ferramentas_permitidas(catalogo, usuario)}


@pytest.mark.parametrize(
    ("fixture_usuario", "esperadas"),
    [
        ("usuario_admin", TODAS),
        ("usuario_atendimento", {"consultar_clientes"}),
        (
            "usuario_projetos",
            {"consultar_ordens_servico", "consultar_tradutores", "consultar_orcamentos"},
        ),
        ("usuario_sem_permissao", set()),
    ],
)
def test_usuario_recebe_somente_ferramentas_do_seu_perfil(
    request, catalogo, fixture_usuario, esperadas
):
    usuario = request.getfixturevalue(fixture_usuario)
    assert _nomes(catalogo, usuario) == esperadas


def test_usuario_sem_roles_nao_recebe_ferramenta(catalogo, criar_usuario):
    assert _nomes(catalogo, criar_usuario()) == set()


def test_role_inativa_nao_concede_ferramenta(catalogo, criar_role, criar_usuario):
    usuario = criar_usuario([criar_role("Projetos", "quotes.read", ativa=False)])
    assert _nomes(catalogo, usuario) == set()


def test_usuario_inativo_nao_recebe_ferramenta(catalogo, criar_role, criar_usuario):
    usuario = criar_usuario([criar_role("Administrador")], is_active=False)
    assert _nomes(catalogo, usuario) == set()


def test_usuario_sem_users_read_nao_recebe_listar_usuarios(catalogo, usuario_atendimento):
    assert "listar_usuarios" not in _nomes(catalogo, usuario_atendimento)
    nomes = [d["name"] for d in definicoes_para_agente(catalogo, usuario_atendimento)]
    assert "listar_usuarios" not in nomes


def test_definicao_para_agente_contem_schema_de_entrada(catalogo, usuario_atendimento):
    definicoes = definicoes_para_agente(catalogo, usuario_atendimento)
    assert [d["name"] for d in definicoes] == ["consultar_clientes"]
    assert set(definicoes[0]["input_schema"]["properties"]) == {"nome", "apenas_ativos"}


def test_registro_duplicado_e_rejeitado(catalogo):
    with pytest.raises(ValueError):
        catalogo.registrar(catalogo.buscar("consultar_clientes"))


def test_buscar_ferramenta_inexistente_retorna_none(catalogo):
    assert catalogo.buscar("apagar_cliente") is None
    assert catalogo.buscar(None) is None
