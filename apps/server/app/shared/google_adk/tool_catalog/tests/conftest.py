from dataclasses import dataclass, field
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.modules.auth.models.roles import Permission, Role
from app.shared.google_adk.tool_catalog import Catalogo
from app.shared.google_adk.tool_catalog.tools import (
    consultar_clientes_spec,
    consultar_orcamentos_spec,
    consultar_ordens_servico_spec,
    consultar_tradutores_spec,
    listar_usuarios_spec,
)


@dataclass
class UsuarioFake:
    id: UUID = field(default_factory=uuid4)
    email: str = "colaborador@exemplo.com"
    is_active: bool = True
    roles: list[Role] = field(default_factory=list)


class FontesFake:
    def __init__(self) -> None:
        self.chamadas: list[tuple[str, tuple[Any, ...]]] = []
        self.excecao: Exception | None = None
        self.usuarios: list[dict[str, Any]] = [
            {"id": "u1", "email": "a@exemplo.com", "role": "admin", "is_active": True}
        ]
        self.clientes: list[dict[str, Any]] = [
            {"id": "c1", "nome_fantasia": "Acme", "cnpj": "00.000.000/0001-00", "ativo": True}
        ]
        self.ordens: list[dict[str, Any]] = [
            {"id": "o1", "nome_projeto": "Contrato", "cliente": "Acme", "quantidade_itens": 2}
        ]
        self.tradutores: list[dict[str, Any]] = [{"id": "t1", "nome": "Maria"}]
        self.orcamentos: list[dict[str, Any]] = [
            {
                "id": "q1",
                "status": "aprovado",
                "itens": [{"tipo_documento": "contrato", "valor_estimado": "100.00"}],
            }
        ]

    def _chamar(self, nome: str, *args: Any) -> None:
        self.chamadas.append((nome, args))
        if self.excecao is not None:
            raise self.excecao

    def buscar_usuarios(self, email, role, apenas_ativos):
        self._chamar("usuarios", email, role, apenas_ativos)
        return self.usuarios

    def buscar_clientes(self, nome, apenas_ativos):
        self._chamar("clientes", nome, apenas_ativos)
        return self.clientes

    def buscar_ordens_servico(self, nome_projeto):
        self._chamar("ordens", nome_projeto)
        return self.ordens

    def buscar_tradutores(self, nome):
        self._chamar("tradutores", nome)
        return self.tradutores

    def buscar_orcamentos(self):
        self._chamar("orcamentos")
        return self.orcamentos


@pytest.fixture
def fontes() -> FontesFake:
    return FontesFake()


@pytest.fixture
def catalogo(fontes: FontesFake) -> Catalogo:
    catalogo = Catalogo()
    catalogo.registrar(listar_usuarios_spec(fontes.buscar_usuarios))
    catalogo.registrar(consultar_clientes_spec(fontes.buscar_clientes))
    catalogo.registrar(consultar_ordens_servico_spec(fontes.buscar_ordens_servico))
    catalogo.registrar(consultar_tradutores_spec(fontes.buscar_tradutores))
    catalogo.registrar(consultar_orcamentos_spec(fontes.buscar_orcamentos))
    return catalogo


@pytest.fixture
def guardrail_aprova():
    async def _guardrail(usuario, spec, entrada):
        return None

    return _guardrail


@pytest.fixture
def guardrail_bloqueia():
    async def _guardrail(usuario, spec, entrada):
        raise RuntimeError("bloqueado")

    return _guardrail


@pytest.fixture
def criar_role():
    def _criar(nome: str, *codigos: str, ativa: bool = True) -> Role:
        return Role(
            name=nome,
            is_active=ativa,
            permissions=[Permission(code=codigo) for codigo in codigos],
        )

    return _criar


@pytest.fixture
def criar_usuario():
    def _criar(roles=None, is_active=True) -> UsuarioFake:
        return UsuarioFake(is_active=is_active, roles=list(roles or []))

    return _criar


@pytest.fixture
def usuario_admin(criar_role, criar_usuario) -> UsuarioFake:
    return criar_usuario([criar_role("Administrador")])


@pytest.fixture
def usuario_atendimento(criar_role, criar_usuario) -> UsuarioFake:
    return criar_usuario(
        [
            criar_role(
                "Atendimento",
                "clients.read",
                "clients.write",
                "requests.read",
                "support.read",
                "support.write",
                "dashboard.read",
            )
        ]
    )


@pytest.fixture
def usuario_projetos(criar_role, criar_usuario) -> UsuarioFake:
    return criar_usuario(
        [
            criar_role(
                "Projetos",
                "quotes.read",
                "service_orders.read",
                "translators.read",
                "assignments.read",
            )
        ]
    )


@pytest.fixture
def usuario_sem_permissao(criar_role, criar_usuario) -> UsuarioFake:
    return criar_usuario(
        [criar_role("Recursos externos", "assignments.read", "documents.read", "dashboard.read")]
    )
