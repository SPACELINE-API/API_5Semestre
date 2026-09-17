import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import CompanyCreate
from app.modules.clients.services.company_service import CompanyService
from app.shared.database import Base, get_database_url


@pytest.fixture
def db_session():
    engine = create_engine(get_database_url())
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    outer_transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    # CompanyService commits internally. Without this, that commit would end
    # outer_transaction and the rollback below would no longer undo the
    # test's writes. Restarting a SAVEPOINT after every commit keeps the
    # whole test inside one transaction we can always roll back.
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


def make_company_data(**overrides) -> CompanyCreate:
    data = {
        "legal_name": "Kaffa Tecnologia Ltda",
        "trade_name": "Kaffa Tech",
        "cnpj": "12.345.678/0001-99",
        "industry": "juridico",
        "phone": "11987654321",
        "email": "contato@kaffatech.com",
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
    assert company.trade_name == "Kaffa Tech"
    assert company.is_active is True
    assert company.created_at is not None


def test_create_company_optional_complement_can_be_omitted(db_session: Session) -> None:
    service = CompanyService(db_session)

    company = service.create_company(make_company_data(complement=None))

    assert company.complement is None


def test_create_company_duplicate_cnpj_raises_conflict(db_session: Session) -> None:
    service = CompanyService(db_session)
    service.create_company(make_company_data())

    with pytest.raises(HTTPException) as exc_info:
        service.create_company(make_company_data(email="other@company.com"))

    assert exc_info.value.status_code == 409


def test_create_company_duplicate_email_raises_conflict(db_session: Session) -> None:
    service = CompanyService(db_session)
    service.create_company(make_company_data())

    with pytest.raises(HTTPException) as exc_info:
        service.create_company(make_company_data(cnpj="98.765.432/0001-11"))

    assert exc_info.value.status_code == 409


def test_list_companies_returns_created_companies(db_session: Session) -> None:
    service = CompanyService(db_session)
    service.create_company(make_company_data())
    service.create_company(make_company_data(cnpj="98.765.432/0001-11", email="other@company.com"))

    companies = service.list_companies()

    assert len(companies) == 2


def test_list_companies_returns_empty_list_when_none_exist(db_session: Session) -> None:
    service = CompanyService(db_session)

    assert service.list_companies() == []
