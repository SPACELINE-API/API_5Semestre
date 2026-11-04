import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from openpyxl import load_workbook
from pydantic import ValidationError

from app.modules.proposals.schemas.report import (
    CompanyReportCompany,
    CompanyReportRequest,
    CompanyReportResponse,
    ExecutionReport,
)
from app.modules.proposals.services.company_report_service import CompanyReportService
from app.modules.proposals.services.report_exporter import build_csv, build_xlsx


def make_report() -> CompanyReportResponse:
    now = datetime.now(UTC)
    execution = ExecutionReport(
        translation_items_value=Decimal("100.00"),
        translators=[],
        files=[],
        deliveries=[],
        delivered_count=0,
        completed_items_count=0,
        completed_items_on_time_count=0,
    )
    company = CompanyReportCompany(
        company_id=uuid.uuid4(),
        legal_name="Empresa Legal Ltda.",
        trade_name="Empresa Legal",
        cnpj="12345678000195",
        industry="Tecnologia",
        city="São Paulo",
        state="SP",
        status="active",
        registered_at=now,
        contacts_count=2,
        requests_total=1,
        requests_by_status={"approved": 1},
        request_languages=["Português", "Inglês"],
        request_needs=["Contrato"],
        request_documents=[],
        proposals_total=1,
        proposals_by_status={"approved": 1},
        estimated_value=Decimal("100.00"),
        translation_items_value=Decimal("80.00"),
        additional_services_value=Decimal("20.00"),
        proposal_created_at=[now],
        proposal_approved_at=[now],
        proposal_reproved_at=[],
        reproval_reasons=[],
        service_orders_total=0,
        service_orders=[],
        execution=execution,
    )
    return CompanyReportResponse(
        period_start=date(2026, 1, 1),
        period_end=date(2026, 1, 31),
        granularity="months",
        companies=[company],
        total_companies=1,
    )


def test_report_request_accepts_supported_filters() -> None:
    request = CompanyReportRequest(
        company_ids=[uuid.uuid4()],
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 31),
        granularity="months",
        format="csv",
    )

    assert request.granularity == "months"
    assert request.format == "csv"


def test_report_request_rejects_inverted_period() -> None:
    with pytest.raises(ValidationError, match="data inicial"):
        CompanyReportRequest(
            company_ids=[uuid.uuid4()],
            start_date=date(2026, 2, 1),
            end_date=date(2026, 1, 31),
        )


def test_report_request_requires_at_least_one_company() -> None:
    with pytest.raises(ValidationError):
        CompanyReportRequest(
            company_ids=[],
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
        )


def test_service_rejects_when_no_company_has_data() -> None:
    service = CompanyReportService(MagicMock())
    service._get_companies = lambda _ids: [SimpleNamespace(id=uuid.uuid4())]
    service._get_contacts_count = lambda _ids: {}
    service._get_requests = lambda _company_id, _filters: []
    service._get_quotes = lambda _company_id, _filters: []
    service._get_service_orders = lambda _company_id, _filters: []

    filters = CompanyReportRequest(
        company_ids=[uuid.uuid4()],
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 31),
    )

    with pytest.raises(HTTPException) as error:
        service.generate(filters)

    assert error.value.status_code == 404
    assert "Nenhuma empresa" in error.value.detail


def test_csv_and_xlsx_contain_the_same_report_columns() -> None:
    report = make_report()
    csv_header = build_csv(report).decode("utf-8-sig").splitlines()[0].split(",")
    workbook = load_workbook(BytesIO(build_xlsx(report)), read_only=True)
    worksheet = workbook["Empresas"]
    xlsx_header = [cell.value for cell in next(worksheet.iter_rows())]

    assert csv_header == xlsx_header
    assert worksheet.max_row == 2


def test_exporters_include_company_data() -> None:
    report = make_report()

    csv_content = build_csv(report).decode("utf-8-sig")
    workbook = load_workbook(BytesIO(build_xlsx(report)), read_only=True)
    xlsx_values = list(workbook["Empresas"].iter_rows(values_only=True))[1]

    assert "Empresa Legal" in csv_content
    assert "Empresa Legal" in xlsx_values
    assert "100.00" in csv_content
