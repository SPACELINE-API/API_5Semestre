import unicodedata
from typing import Any


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acento.casefold().strip()


def resolver(nome: str, opcoes: list[tuple[Any, str]]) -> tuple[Any | None, list[str]]:
    alvo = normalizar(nome)
    exatos = [o for o in opcoes if normalizar(o[1]) == alvo]
    candidatos = exatos or [o for o in opcoes if alvo in normalizar(o[1])]
    if len(candidatos) == 1:
        return candidatos[0][0], []
    return None, [c[1] for c in candidatos[:10]]


def indicadores(origem: Any) -> dict[str, Any]:
    return {
        "documentos_traduzidos": origem.documents_translated,
        "total_palavras": origem.total_words,
        "valor_total": str(origem.total_value),
        "quantidade_ordens_servico": origem.projects_count,
        "concluidos_no_prazo": origem.on_time_documents,
        "concluidos_fora_do_prazo": origem.late_documents,
        "percentual_no_prazo": (
            round(origem.on_time_rate * 100, 2) if origem.on_time_rate is not None else None
        ),
        "tempo_medio_execucao_dias": origem.average_turnaround_days,
    }
