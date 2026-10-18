from .adk_usuario import carregar_usuario_por_email
from .contract import CarregarUsuario
from .permissions import assuntos_negados
from .registry import Catalogo


class AssuntoNaoPermitido(Exception):
    def __init__(self, assuntos: list[str]) -> None:
        super().__init__(", ".join(assuntos))
        self.assuntos = assuntos


class UsuarioNaoAutorizado(Exception):
    pass


async def verificar_assunto(
    texto: str,
    user_id: str,
    catalogo: Catalogo,
    carregar_usuario: CarregarUsuario = carregar_usuario_por_email,
) -> None:
    usuario = await carregar_usuario(user_id)
    if usuario is None:
        raise UsuarioNaoAutorizado()
    negados = assuntos_negados(catalogo, usuario, texto)
    if negados:
        raise AssuntoNaoPermitido([spec.topic_label for spec in negados])
