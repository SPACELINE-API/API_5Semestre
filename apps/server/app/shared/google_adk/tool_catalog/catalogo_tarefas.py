from functools import lru_cache

from .catalogo_leitura import criar_catalogo_leitura
from .registry import Catalogo
from .tools.tarefas import (
    criar_tarefa_funcionario_spec,
    criar_tarefa_spec,
    listar_funcionarios_tarefa_spec,
)


def criar_catalogo_tarefas() -> Catalogo:
    catalogo = criar_catalogo_leitura()
    catalogo.registrar(criar_tarefa_spec())
    catalogo.registrar(listar_funcionarios_tarefa_spec())
    catalogo.registrar(criar_tarefa_funcionario_spec())
    return catalogo


@lru_cache(maxsize=1)
def obter_catalogo_tarefas() -> Catalogo:
    return criar_catalogo_tarefas()
