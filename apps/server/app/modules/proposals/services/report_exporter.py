from __future__ import annotations

import csv
import io
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from openpyxl import Workbook  
from openpyxl.styles import Font  

from app.modules.proposals.schemas.report import CompanyReportCompany, CompanyReportResponse

CSV_COLUMNS = (
    "company_id",
    "legal_name",
    "trade_name",
    "cnpj",
    "industry",
    "city",
    "state",
    "registered_at",
    "contacts_count",
    "requests_total",
    "requests_by_status",
    "request_languages",
    "request_needs",
    "proposals_total",
    "proposals_by_status",
    "estimated_value",
    "translation_items_value",
    "additional_services_value",
    "proposal_created_at",
    "proposal_approved_at",
    "proposal_reproved_at",
    "service_orders_total",
    "service_orders",
)

CSV_HEADERS = (
    "ID da empresa",
    "Razão social",
    "Nome fantasia",
    "CNPJ",
    "Segmento",
    "Cidade",
    "Estado",
    "Data de cadastro",
    "Quantidade de contatos",
    "Total de requisições",
    "Requisições por status",
    "Idiomas das requisições",
    "Necessidades das requisições",
    "Total de propostas",
    "Propostas por status",
    "Valor estimado",
    "Valor dos itens de tradução",
    "Valor dos serviços adicionais",
    "Datas de criação das propostas",
    "Datas de aprovação das propostas",
    "Datas de reprovação das propostas",
    "Total de ordens de serviço",
    "Ordens de serviço",
)

JSON_KEY_TRANSLATIONS = {
    "company_id": "empresa_id",
    "legal_name": "razao_social",
    "trade_name": "nome_fantasia",
    "industry": "segmento",
    "city": "cidade",
    "state": "estado",
    "registered_at": "data_cadastro",
    "contacts_count": "quantidade_contatos",
    "requests_total": "total_requisicoes",
    "requests_by_status": "requisicoes_por_status",
    "request_languages": "idiomas_requisicoes",
    "request_needs": "necessidades_requisicoes",
    "proposals_total": "total_propostas",
    "proposals_by_status": "propostas_por_status",
    "estimated_value": "valor_estimado",
    "translation_items_value": "valor_itens_traducao",
    "additional_services_value": "valor_servicos_adicionais",
    "proposal_created_at": "datas_criacao_propostas",
    "proposal_approved_at": "datas_aprovacao_propostas",
    "proposal_reproved_at": "datas_reprovacao_propostas",
    "service_orders_total": "total_ordens_servico",
    "service_orders": "ordens_servico",
    "period_start": "periodo_inicio",
    "period_end": "periodo_fim",
    "granularity": "granularidade",
    "companies": "empresas",
    "total_companies": "total_empresas",
    "filename": "nome_arquivo",
    "content_type": "tipo_conteudo",
    "file_url": "url_arquivo",
    "service_order_id": "ordem_servico_id",
    "project_name": "nome_projeto",
    "domain_area": "area",
    "price_category": "categoria_preco",
    "items_count": "quantidade_itens",
    "completed_items_count": "quantidade_itens_concluidos",
    "item_id": "item_id",
    "source_language": "idioma_origem",
    "target_language": "idioma_destino",
    "document_type": "tipo_documento",
    "price": "preco",
    "deadline": "prazo",
    "completed_at": "concluido_em",
    "completed_on_time": "concluido_no_prazo",
    "translator_id": "tradutor_id",
    "translator_name": "nome_tradutor",
    "translators": "tradutores",
    "files": "arquivos",
    "deliveries": "entregas",
    "delivered_count": "quantidade_entregas",
    "completed_items_on_time_count": "quantidade_concluida_no_prazo",
    "file_id": "arquivo_id",
    "direction": "direcao",
    "review_status": "status_revisao",
    "delivery_status": "status_entrega",
    "uploaded_at": "enviado_em",
    "delivery_id": "entrega_id",
    "document_file_id": "arquivo_documento_id",
    "status": "status",
    "attempted_at": "tentativa_em",
    "sent_at": "enviado_em",
    "error_message": "mensagem_erro",
}

VALUE_TRANSLATIONS = {
    "active": "Ativa",
    "inactive": "Inativa",
    "pending": "Pendente",
    "approved": "Aprovado",
    "reproved": "Reprovado",
    "failed": "Falhou",
    "sent": "Enviado",
    "not_sent": "Não enviado",
    "changes_requested": "Alterações solicitadas",
    "pendente": "Pendente",
    "em_andamento": "Em andamento",
    "em_analise": "Em análise",
    "concluida": "Concluída",
    "entrada": "Entrada",
    "saida": "Saída",
    "days": "Dias",
    "months": "Meses",
    "years": "Anos",
}

ISO_DATE_PATTERN = re.compile(
    r"\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b"
)


def _serialize(value: Any) -> str:
    if isinstance(value, dict):
        return "; ".join(f"{key}: {_serialize(item)}" for key, item in value.items())
    if isinstance(value, list):
        return " | ".join(_serialize(item) for item in value)
    return str(value) if value is not None else ""


def _format_excel_dates(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        raw = match.group(0)
        try:
            if "T" not in raw:
                return datetime.fromisoformat(raw).strftime("%d/%m/%Y")
            normalized = raw.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized).strftime("%d/%m/%Y %H:%M")
        except ValueError:
            return raw

    return ISO_DATE_PATTERN.sub(replace, value)


def _format_brazilian_value(column: str, value: str) -> str:
    if column in {
        "estimated_value",
        "translation_items_value",
        "additional_services_value",
    }:
        try:
            amount = Decimal(value)
        except (InvalidOperation, ValueError):
            return value
        formatted = f"{amount:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
        return f"R$ {formatted}"
    return _format_excel_dates(value)


def _company_row(company: CompanyReportCompany) -> dict[str, str]:
    values = _translate_dict(company.model_dump(mode="json"))
    row = {
        column: _serialize(values.get(JSON_KEY_TRANSLATIONS.get(column, column)))
        for column in CSV_COLUMNS
    }
    service_orders = values.get("ordens_servico", [])
    if isinstance(service_orders, list):
        row["service_orders"] = ", ".join(
            item.get("ordem_servico_id", "")
            for item in service_orders
            if isinstance(item, dict) and item.get("ordem_servico_id")
        )
    return row


def _translate_value(value: Any, key: str | None = None) -> Any:
    if isinstance(value, bool):
        return "Sim" if value else "Não"
    if value is None:
        return value
    if isinstance(value, str):
        if key in {"status", "direction", "review_status", "delivery_status", "granularity"}:
            return VALUE_TRANSLATIONS.get(value, value)
        return value
    return value


def _translate_dict(values: dict[str, Any]) -> dict[str, Any]:
    translated: dict[str, Any] = {}
    for key, value in values.items():
        translated_key = JSON_KEY_TRANSLATIONS.get(key, key)
        translated_value: Any
        if isinstance(value, dict):
            if key in {"requests_by_status", "proposals_by_status"}:
                translated_value = {
                    VALUE_TRANSLATIONS.get(str(nested_key), str(nested_key)): nested_value
                    for nested_key, nested_value in value.items()
                }
            else:
                translated_value = _translate_dict(value)
        elif isinstance(value, list):
            translated_value = [
                _translate_dict(item) if isinstance(item, dict) else _translate_value(item, key)
                for item in value
            ]
        else:
            translated_value = _translate_value(value, key)
        translated[translated_key] = translated_value
    return translated


def build_csv(report: CompanyReportResponse) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(
        output,
        fieldnames=CSV_COLUMNS,
        extrasaction="ignore",
        delimiter=";",
    )
    writer.writerow(dict(zip(CSV_COLUMNS, CSV_HEADERS, strict=True)))
    writer.writerows(
        {
            column: _format_brazilian_value(column, value)
            for column, value in _company_row(company).items()
        }
        for company in report.companies
    )
    return ("\ufeff" + output.getvalue()).encode("utf-8")


def build_xlsx(report: CompanyReportResponse) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Empresas"
    worksheet.append(list(CSV_HEADERS))

    for cell in worksheet[1]:
        cell.font = Font(bold=True)

    for company in report.companies:
        row = _company_row(company)
        worksheet.append([_format_brazilian_value(column, row[column]) for column in CSV_COLUMNS])

    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions
    for column_cells in worksheet.columns:
        width = max(len(str(cell.value or "")) for cell in column_cells)
        worksheet.column_dimensions[column_cells[0].column_letter].width = min(width + 2, 60)

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()
