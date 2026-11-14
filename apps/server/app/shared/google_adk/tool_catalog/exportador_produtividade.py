import csv
import io
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

CABECALHO = [
    "Tradutor",
    "Documentos traduzidos",
    "Total de palavras",
    "Valor total (R$)",
    "Ordens de serviço",
    "Concluídos no prazo",
    "Concluídos fora do prazo",
    "% no prazo",
    "Tempo médio (dias)",
]

CONTENT_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _linha(nome: str, o: Any) -> list[Any]:
    return [
        nome,
        o.documents_translated,
        o.total_words,
        float(o.total_value),
        o.projects_count,
        o.on_time_documents,
        o.late_documents,
        round(o.on_time_rate * 100, 2) if o.on_time_rate is not None else None,
        o.average_turnaround_days,
    ]


def _linhas(relatorio: Any) -> list[list[Any]]:
    return [_linha("Geral", relatorio.summary)] + [
        _linha(t.translator_name, t) for t in relatorio.translators
    ]


def gerar_csv(relatorio: Any) -> bytes:
    saida = io.StringIO(newline="")
    escritor = csv.writer(saida, delimiter=";")
    escritor.writerow(CABECALHO)
    for linha in _linhas(relatorio):
        escritor.writerow(
            [
                "" if v is None else str(v).replace(".", ",") if isinstance(v, float) else v
                for v in linha
            ]
        )
    return ("\ufeff" + saida.getvalue()).encode("utf-8")


def gerar_xlsx(relatorio: Any) -> bytes:
    wb = Workbook()
    ws = wb.active
    if not isinstance(ws, Worksheet):
        raise RuntimeError("Planilha ativa inválida")
    ws.title = "Produtividade"
    ws.append(CABECALHO)
    for celula in ws[1]:
        celula.font = Font(bold=True)
    for linha in _linhas(relatorio):
        ws.append(linha)
    ws.freeze_panes = "A2"
    for indice, coluna in enumerate(ws.columns, start=1):
        largura = max(len(str(c.value or "")) for c in coluna)
        ws.column_dimensions[get_column_letter(indice)].width = min(largura + 2, 40)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def gerar_arquivo(relatorio: Any, formato: str) -> tuple[bytes, str, str]:
    conteudo = gerar_xlsx(relatorio) if formato == "xlsx" else gerar_csv(relatorio)
    return conteudo, f"relatorio-produtividade.{formato}", CONTENT_TYPES[formato]