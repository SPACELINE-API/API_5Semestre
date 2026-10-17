from collections.abc import Awaitable, Callable, Collection
from dataclasses import dataclass
from typing import Any, Protocol

from pydantic import BaseModel

from .errors import CodigoErro


class Usuario(Protocol):
    @property
    def id(self) -> Any: ...

    @property
    def is_active(self) -> bool: ...

    @property
    def roles(self) -> Collection[Any]: ...


CarregarUsuario = Callable[[str], Awaitable[Usuario | None]]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]
    errors: tuple[CodigoErro, ...]
    required_permission: str
    handler: Callable[[Any, Usuario], Any]
    free_text_fields: tuple[str, ...] = ()
    topic_keywords: tuple[str, ...] = ()
    topic_label: str = ""
