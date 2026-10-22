import asyncio

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.modules.auth.models.roles import Permission, Role, role_permissions, user_roles
from app.modules.auth.models.user import User
from app.shared.database import Base
from app.shared.google_adk.tool_catalog.adk_usuario import carregar_usuario_por_email


@pytest.fixture
def provider():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            Role.__table__,
            Permission.__table__,
            user_roles,
            role_permissions,
        ],
    )
    fabrica = sessionmaker(engine)
    return lambda: fabrica


def _criar_usuario(provider) -> str:
    db = provider()()
    role = Role(
        name="Projetos",
        is_active=True,
        permissions=[Permission(code="assignments.write")],
    )
    usuario = User(email="a@exemplo.com", password_hash="x", role="admin", roles=[role])
    db.add(usuario)
    db.commit()
    email = usuario.email
    db.close()
    return email


def test_carrega_usuario_com_roles_e_permissoes(provider):
    email = _criar_usuario(provider)
    usuario = asyncio.run(carregar_usuario_por_email(email, provider))
    assert usuario is not None
    assert usuario.is_active is True
    assert [role.name for role in usuario.roles] == ["Projetos"]
    assert [p.code for p in usuario.roles[0].permissions] == ["assignments.write"]


def test_email_inexistente_retorna_none(provider):
    _criar_usuario(provider)
    assert asyncio.run(carregar_usuario_por_email("outro@exemplo.com", provider)) is None


def test_identificador_padrao_do_fluxo_nao_encontra_usuario(provider):
    _criar_usuario(provider)
    assert asyncio.run(carregar_usuario_por_email("chat-support", provider)) is None


def test_email_vazio_retorna_none(provider):
    assert asyncio.run(carregar_usuario_por_email("  ", provider)) is None
