import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.contacts.schemas.contact import ContactCreate, ContactUpdate
from app.modules.contacts.services.contact_service import ContactService
from app.shared.database import Base, get_database_url


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

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


@pytest.fixture(autouse=True)
def clean_db(db_session: Session):
    db_session.query(Contact).delete()
    db_session.commit()


@pytest.fixture
def test_company(db_session: Session) -> Company:
    company = Company(
        legal_name="Test Company Ltda",
        trade_name="Test Company",
        cnpj="11.222.333/0001-44",
        industry="Tech",
        phone="11987654321",
        email="contact@testcompany.com",
        zip_code="00000-000",
        street="Street",
        number="1",
        neighborhood="Downtown",
        city="City",
        state="ST",
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


def make_contact_data(company_id: uuid.UUID, **overrides) -> ContactCreate:
    data = {
        "name": "John Doe",
        "email": "johndoe@example.com",
        "phone": "(11) 98765-4321",
        "department": "IT",
        "company_id": company_id,
    }
    data.update(overrides)
    return ContactCreate(**data)


def test_create_contact_success(db_session: Session, test_company: Company) -> None:
    service = ContactService(db_session)
    data = make_contact_data(test_company.id)

    result = service.create_contact(data)

    assert result["message"] == "Contato cadastrado com sucesso."
    assert isinstance(result["contact"], Contact)
    assert result["contact"].id is not None
    assert result["contact"].name == "John Doe"
    assert result["contact"].company_id == test_company.id


def test_create_contact_company_not_found(db_session: Session) -> None:
    service = ContactService(db_session)
    data = make_contact_data(uuid.uuid4())

    with pytest.raises(HTTPException) as exc_info:
        service.create_contact(data)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Empresa associada não encontrada."


def test_list_contacts_success(db_session: Session, test_company: Company) -> None:
    service = ContactService(db_session)
    service.create_contact(make_contact_data(test_company.id, email="first@example.com"))
    service.create_contact(make_contact_data(test_company.id, email="second@example.com"))

    contacts = service.list_contacts()

    assert len(contacts) == 2


def test_update_contact_success(db_session: Session, test_company: Company) -> None:
    service = ContactService(db_session)
    created = service.create_contact(make_contact_data(test_company.id))["contact"]

    update_data = ContactUpdate(name="Jane Doe", department="Finance")
    updated = service.update_contact(created.id, update_data)

    assert updated.id == created.id
    assert updated.name == "Jane Doe"
    assert updated.department == "Finance"
    assert updated.phone == "(11) 98765-4321"


def test_delete_contact_success(db_session: Session, test_company: Company) -> None:
    service = ContactService(db_session)
    created = service.create_contact(make_contact_data(test_company.id))["contact"]

    service.delete_contact(created.id)
    contacts = service.list_contacts()
    assert len(contacts) == 0
