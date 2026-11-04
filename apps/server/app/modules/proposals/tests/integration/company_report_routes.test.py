import uuid
from datetime import UTC, date, datetime
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app.main import app
from app.modules.clients.models.company import Company
from app.modules.proposals.routes import proposals_read_permission
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum
from app.shared.database import get_db

REPORT_URL = "/api/quotes/proposals/reports"


@pytest.fixture
def report_client(isolated_db_session):
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[proposals_read_permission] = lambda: object()
    with TestClient(app) as client:
        yield client, isolated_db_session
    app.dependency_overrides.clear()


def create_company(db, *, with_data: bool = True) -> Company:
    company = Company(
        legal_name=f"Empresa Legal {uuid.uuid4().hex[:8]} Ltda.",
        trade_name=f"Empresa Teste {uuid.uuid4().hex[:8]}",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        is_active=True,
        industry="Tecnologia",
        phone="11999990000",
        email=f"empresa-{uuid.uuid4().hex[:8]}@teste.com",
        zip_code="01001000",
        street="Rua da Empresa",
        number="100",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
        created_at=datetime(2026, 1, 5, tzinfo=UTC),
    )
    db.add(company)
    db.flush()

    if with_data:
        request = Request(
            company_id=company.id,
            customer_name="Cliente Teste",
            enterprise=company.trade_name,
            email="cliente@teste.com",
            original_language="Português",
            translation_language="Inglês",
            customer_need="Contrato",
            status=StatusEnum.APPROVED,
            request_date=date(2026, 1, 10),
        )
        db.add(request)
        db.flush()
        db.add(
            Quote(
                request_id=request.id,
                company_id=company.id,
                customer_name=request.customer_name,
                enterprise=company.trade_name,
                email=request.email,
                original_language=request.original_language,
                translation_language=request.translation_language,
                customer_need=request.customer_need,
                status="approved",
                created_at=datetime(2026, 1, 11, tzinfo=UTC),
                approved_at=datetime(2026, 1, 12, tzinfo=UTC),
            )
        )
    db.commit()
    return company


def report_payload(company_id: uuid.UUID, report_format: str = "json") -> dict:
    return {
        "company_ids": [str(company_id)],
        "start_date": "2026-01-01",
        "end_date": "2026-01-31",
        "granularity": "months",
        "format": report_format,
    }


def test_report_route_returns_json_from_temporary_database(report_client) -> None:
    client, db = report_client
    company = create_company(db)

    response = client.post(REPORT_URL, json=report_payload(company.id))

    assert response.status_code == 200
    body = response.json()
    assert body["total_empresas"] == 1
    assert body["empresas"][0]["empresa_id"] == str(company.id)
    assert body["empresas"][0]["total_requisicoes"] == 1
    assert body["empresas"][0]["total_propostas"] == 1


def test_report_route_returns_csv_from_temporary_database(report_client) -> None:
    client, db = report_client
    company = create_company(db)

    response = client.post(REPORT_URL, json=report_payload(company.id, "csv"))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert company.trade_name in response.content.decode("utf-8-sig")


def test_report_route_returns_excel_from_temporary_database(report_client) -> None:
    client, db = report_client
    company = create_company(db)

    response = client.post(REPORT_URL, json=report_payload(company.id, "xlsx"))

    assert response.status_code == 200
    workbook = load_workbook(BytesIO(response.content), read_only=True)
    assert workbook.sheetnames == ["Empresas"]
    assert workbook["Empresas"].max_row == 2


def test_report_route_rejects_inverted_period(report_client) -> None:
    client, _db = report_client
    payload = report_payload(uuid.uuid4())
    payload["start_date"] = "2026-02-01"

    response = client.post(REPORT_URL, json=payload)

    assert response.status_code == 422


def test_report_route_returns_not_found_without_period_data(report_client) -> None:
    client, db = report_client
    company = create_company(db, with_data=False)

    response = client.post(REPORT_URL, json=report_payload(company.id))

    assert response.status_code == 404
    assert "Nenhuma empresa" in response.json()["detail"]
