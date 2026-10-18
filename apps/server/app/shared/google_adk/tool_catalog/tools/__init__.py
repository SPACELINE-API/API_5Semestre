from .clientes import consultar_clientes_spec
from .orcamentos import consultar_orcamentos_spec
from .ordens_servico import consultar_ordens_servico_spec
from .tradutores import consultar_tradutores_spec
from .usuarios import listar_usuarios_spec

__all__ = [
    "consultar_clientes_spec",
    "consultar_orcamentos_spec",
    "consultar_ordens_servico_spec",
    "consultar_tradutores_spec",
    "listar_usuarios_spec",
]
