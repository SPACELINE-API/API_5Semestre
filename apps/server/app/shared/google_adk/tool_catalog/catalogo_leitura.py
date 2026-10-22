from functools import lru_cache

from . import consultas
from .registry import Catalogo
from .tools import (
    consultar_clientes_spec,
    consultar_orcamentos_spec,
    consultar_ordens_servico_spec,
    consultar_tradutores_spec,
    listar_usuarios_spec,
)


def criar_catalogo_leitura() -> Catalogo:
    catalogo = Catalogo()
    catalogo.registrar(listar_usuarios_spec(consultas.buscar_usuarios))
    catalogo.registrar(consultar_clientes_spec(consultas.buscar_clientes))
    catalogo.registrar(consultar_ordens_servico_spec(consultas.buscar_ordens_servico))
    catalogo.registrar(consultar_tradutores_spec(consultas.buscar_tradutores))
    catalogo.registrar(consultar_orcamentos_spec(consultas.buscar_orcamentos))
    return catalogo


@lru_cache(maxsize=1)
def obter_catalogo_leitura() -> Catalogo:
    return criar_catalogo_leitura()
