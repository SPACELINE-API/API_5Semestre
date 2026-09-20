__test__ = False


def testar_conhecimento(pergunta: str) -> str:
    """Executa uma resposta de teste para validar o uso da tool pelo agente."""
    return f"Tool executada com sucesso para: {pergunta}"


testar_conhecimento.__test__ = False  # type: ignore[attr-defined]
