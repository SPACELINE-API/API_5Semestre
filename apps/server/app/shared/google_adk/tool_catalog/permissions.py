import re
import unicodedata
from typing import Any

from app.modules.auth.services.roles_service import has_permission

from .contract import ToolSpec, Usuario
from .registry import Catalogo


def usuario_pode(usuario: Usuario, spec: ToolSpec) -> bool:
    if not usuario.is_active:
        return False
    return has_permission(usuario.roles, spec.required_permission)


def ferramentas_permitidas(catalogo: Catalogo, usuario: Usuario) -> list[ToolSpec]:
    return [spec for spec in catalogo.listar() if usuario_pode(usuario, spec)]


def definicoes_para_agente(catalogo: Catalogo, usuario: Usuario) -> list[dict[str, Any]]:
    return [
        {
            "name": spec.name,
            "description": spec.description,
            "input_schema": spec.input_schema.model_json_schema(),
        }
        for spec in ferramentas_permitidas(catalogo, usuario)
    ]


def normalizar_texto(texto: str) -> str:
    sem_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acentos.casefold()


def _menciona_assunto(spec: ToolSpec, texto_normalizado: str) -> bool:
    return any(
        re.search(rf"\b{re.escape(normalizar_texto(palavra))}", texto_normalizado)
        for palavra in spec.topic_keywords
    )


def assuntos_negados(catalogo: Catalogo, usuario: Usuario, texto: str) -> list[ToolSpec]:
    texto_normalizado = normalizar_texto(texto)
    mencionados = [spec for spec in catalogo.listar() if _menciona_assunto(spec, texto_normalizado)]
    if any(usuario_pode(usuario, spec) for spec in mencionados):
        return []
    return mencionados
