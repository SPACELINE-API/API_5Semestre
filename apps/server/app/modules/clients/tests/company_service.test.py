import random
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    calculate_cnpj_check_digit,
)
from app.modules.clients.services.company_service import CompanyService
from app.modules.service_orders.models.service_order import ServiceOrder
from app.shared.database import Base, get_database_url

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def generate_valid_cnpj() -> str:
    base = "".join(str(random.randint(0, 9)) for _ in range(12))
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


@pytest.fixture
def db_session():
    engine = create_engine(get_database_url())
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    outer_transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()

    session.query(ServiceOrder).delete()
    session.query(Company).delete()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


def make_company_data(**overrides) -> CompanyCreate:
    unique_suffix = uuid.uuid4().hex[:10]
    data = {
        "legal_name": "Acme Tecnologia Ltda",
        "trade_name": "Acme Tech",
        "cnpj": generate_valid_cnpj(),
        "industry": "juridico",
        "phone": "11987654321",
        "email": f"{unique_suffix}@acmetech.com",
        "zip_code": "01310-100",
        "street": "Avenida Paulista",
        "number": "1000",
        "complement": "Sala 202",
        "neighborhood": "Bela Vista",
        "city": "Sao Paulo",
        "state": "SP",
    }
    data.update(overrides)
    return CompanyCreate(**data)


def test_create_company_success(db_session: Session) -> None:
    service = CompanyService(db_session)

    company = service.create_company(make_company_data())

    assert isinstance(company, Company)
    assert company.id is not None
    assert company.trade_name == "Acme Tech"
    assert company.is_active is True
    assert company.created_at is not None


def test_create_company_optional_complement_can_be_omitted(db_session: Session) -> None:
    service = CompanyService(db_session)

    company = service.create_company(make_company_data(complement=None))

    assert company.complement is None


def test_create_company_duplicate_cnpj_raises_conflict(db_session: Session) -> None:
    service = CompanyService(db_session)
    first = service.create_company(make_company_data())

    with pytest.raises(HTTPException) as exc_info:
        service.create_company(make_company_data(cnpj=first.cnpj))

    assert exc_info.value.status_code == 409


def test_create_company_duplicate_email_raises_conflict(db_session: Session) -> None:
    service = CompanyService(db_session)
    first = service.create_company(make_company_data())

    with pytest.raises(HTTPException) as exc_info:
        service.create_company(make_company_data(email=first.email))

    assert exc_info.value.status_code == 409


def test_list_companies_returns_created_companies(db_session: Session) -> None:
    service = CompanyService(db_session)
    service.create_company(make_company_data())
    service.create_company(make_company_data())

    companies = service.list_companies()

    assert len(companies) == 2


def test_list_companies_returns_empty_list_when_none_exist(db_session: Session) -> None:
    service = CompanyService(db_session)

    assert service.list_companies() == []


def test_get_company_returns_matching_company(db_session: Session) -> None:
    service = CompanyService(db_session)
    created = service.create_company(make_company_data())

    company = service.get_company(created.id)

    assert company.id == created.id


def test_get_company_raises_404_when_not_found(db_session: Session) -> None:
    service = CompanyService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.get_company(uuid.uuid4())

    assert exc_info.value.status_code == 404


def test_update_company_changes_only_given_fields(db_session: Session) -> None:
    service = CompanyService(db_session)
    created = service.create_company(make_company_data())

    updated = service.update_company(created.id, CompanyUpdate(trade_name="Novo Nome Fantasia"))

    assert updated.trade_name == "Novo Nome Fantasia"
    assert updated.legal_name == created.legal_name
    assert updated.cnpj == created.cnpj


def test_update_company_can_deactivate(db_session: Session) -> None:
    service = CompanyService(db_session)
    created = service.create_company(make_company_data())
    assert created.is_active is True

    updated = service.update_company(created.id, CompanyUpdate(is_active=False))

    assert updated.is_active is False


def test_update_company_raises_404_when_not_found(db_session: Session) -> None:
    service = CompanyService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.update_company(uuid.uuid4(), CompanyUpdate(trade_name="X"))

    assert exc_info.value.status_code == 404


def test_update_company_duplicate_cnpj_raises_conflict(db_session: Session) -> None:
    service = CompanyService(db_session)
    first = service.create_company(make_company_data())
    second = service.create_company(make_company_data())

    with pytest.raises(HTTPException) as exc_info:
        service.update_company(second.id, CompanyUpdate(cnpj=first.cnpj))

    assert exc_info.value.status_code == 409


def test_delete_company_removes_it(db_session: Session) -> None:
    service = CompanyService(db_session)
    created = service.create_company(make_company_data())

    service.delete_company(created.id)

    with pytest.raises(HTTPException) as exc_info:
        service.get_company(created.id)

    assert exc_info.value.status_code == 404


def test_delete_company_raises_404_when_not_found(db_session: Session) -> None:
    service = CompanyService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.delete_company(uuid.uuid4())

    assert exc_info.value.status_code == 404
