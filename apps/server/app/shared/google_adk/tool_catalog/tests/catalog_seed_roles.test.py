import asyncio

import pytest

from app.modules.auth.models.roles import Permission, Role
from app.modules.seed.seed_roles import ADMIN_PERMISSIONS, SEED_ROLES
from app.shared.google_adk.tool_catalog import Executor, ferramentas_permitidas
from app.shared.google_adk.tool_catalog.errors import CodigoErro

TODAS = {
    "listar_usuarios",
    "consultar_clientes",
    "consultar_ordens_servico",
    "consultar_tradutores",
    "consultar_orcamentos",
}

FERRAMENTAS_POR_ROLE = {
    "Administrador": TODAS,
    "Operador": TODAS,
    "Atendimento": {"consultar_clientes"},
    "Projetos": {"consultar_ordens_servico", "consultar_tradutores", "consultar_orcamentos"},
    "Financeiro": {"consultar_ordens_servico", "consultar_orcamentos"},
    "Recursos externos": set(),
}

ROLES_POR_FERRAMENTA = {
    "listar_usuarios": {"Administrador", "Operador"},
    "consultar_clientes": {"Administrador", "Operador", "Atendimento"},
    "consultar_tradutores": {"Administrador", "Operador", "Projetos"},
    "consultar_orcamentos": {"Administrador", "Operador", "Projetos", "Financeiro"},
    "consultar_ordens_servico": {"Administrador", "Operador", "Projetos", "Financeiro"},
}


def _role_do_seed(nome: str) -> Role:
    seed = next(role for role in SEED_ROLES if role.name == nome)
    return Role(
        name=seed.name,
        is_active=True,
        permissions=[Permission(code=codigo) for codigo in seed.permissions],
    )


def _nomes(catalogo, criar_usuario, nome_role: str) -> set[str]:
    usuario = criar_usuario([_role_do_seed(nome_role)])
    return {spec.name for spec in ferramentas_permitidas(catalogo, usuario)}


def test_toda_role_do_seed_tem_expectativa_neste_teste():
    assert {role.name for role in SEED_ROLES} == set(FERRAMENTAS_POR_ROLE)


@pytest.mark.parametrize(("nome_role", "esperadas"), list(FERRAMENTAS_POR_ROLE.items()))
def test_role_do_seed_recebe_somente_as_ferramentas_do_seu_perfil(
    catalogo, criar_usuario, nome_role, esperadas
):
    assert _nomes(catalogo, criar_usuario, nome_role) == esperadas


@pytest.mark.parametrize(("ferramenta", "esperadas"), list(ROLES_POR_FERRAMENTA.items()))
def test_roles_que_acessam_cada_ferramenta(catalogo, criar_usuario, ferramenta, esperadas):
    roles = {
        role.name for role in SEED_ROLES if ferramenta in _nomes(catalogo, criar_usuario, role.name)
    }
    assert roles == esperadas


def test_permissoes_das_ferramentas_existem_no_seed(catalogo):
    for spec in catalogo.listar():
        assert spec.required_permission in ADMIN_PERMISSIONS


def test_atendimento_do_seed_e_barrado_ao_listar_usuarios(
    catalogo, guardrail_aprova, fontes, criar_usuario
):
    usuario = criar_usuario([_role_do_seed("Atendimento")])
    resultado = asyncio.run(
        Executor(catalogo, guardrail_aprova).executar("listar_usuarios", {}, usuario)
    )
    assert resultado.erro == CodigoErro.SEM_PERMISSAO
    assert fontes.chamadas == []


def test_atendimento_do_seed_e_barrado_ao_consultar_tradutores(
    catalogo, guardrail_aprova, fontes, criar_usuario
):
    usuario = criar_usuario([_role_do_seed("Atendimento")])
    resultado = asyncio.run(
        Executor(catalogo, guardrail_aprova).executar("consultar_tradutores", {}, usuario)
    )
    assert resultado.erro == CodigoErro.SEM_PERMISSAO
    assert fontes.chamadas == []
