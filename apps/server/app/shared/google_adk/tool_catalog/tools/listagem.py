from typing import Any

LIMITE_RESULTADOS = 50


def montar_listagem(registros: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "itens": registros[:LIMITE_RESULTADOS],
        "truncado": len(registros) > LIMITE_RESULTADOS,
    }
