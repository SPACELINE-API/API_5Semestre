from __future__ import annotations

import csv
import io
import json
from typing import Any

from app.modules.proposals.schemas.report import CompanyReportCompany, CompanyReportResponse

CSV_COLUMNS = (
    "company_id",
    "legal_name",
    "trade_name",
    "cnpj",
    "industry",
    "city",
    "state",
    "status",
    "registered_at",
    "contacts_count",
    "requests_total",
    "requests_by_status",
    "request_languages",
    "request_needs",
    "request_documents",
    "proposals_total",
    "proposals_by_status",
    "estimated_value",
    "translation_items_value",
    "additional_services_value",
    "proposal_created_at",
    "proposal_approved_at",
    "proposal_reproved_at",
    "reproval_reasons",
    "service_orders_total",
    "service_orders",
    "execution",
)


def _serialize(value: Any) -> str:
    if isinstance(value, list | dict):
        return json.dumps(value, ensure_ascii=False, default=str)
    return str(value) if value is not None else ""


def _company_row(company: CompanyReportCompany) -> dict[str, str]:
    values = company.model_dump(mode="json")
    values["service_orders"] = values.pop("service_orders")
    values["execution"] = values.pop("execution")
    return {column: _serialize(values.get(column)) for column in CSV_COLUMNS}


def build_csv(report: CompanyReportResponse) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(_company_row(company) for company in report.companies)
    return ("\ufeff" + output.getvalue()).encode("utf-8")
