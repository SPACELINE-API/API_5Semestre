from .contract import ToolSpec


class Catalogo:
    def __init__(self) -> None:
        self._ferramentas: dict[str, ToolSpec] = {}

    def registrar(self, spec: ToolSpec) -> None:
        if spec.name in self._ferramentas:
            raise ValueError(f"Ferramenta já registrada: {spec.name}")
        self._ferramentas[spec.name] = spec

    def buscar(self, nome: str) -> ToolSpec | None:
        if not isinstance(nome, str):
            return None
        return self._ferramentas.get(nome)

    def listar(self) -> list[ToolSpec]:
        return list(self._ferramentas.values())
