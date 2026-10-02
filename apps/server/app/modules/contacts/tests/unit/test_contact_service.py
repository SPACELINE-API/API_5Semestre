import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.contacts.schemas.contact import ContactCreate, ContactUpdate
from app.modules.contacts.services.contact_service import ContactService


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


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


def test_contact_schema_rejects_values_over_database_column_limits() -> None:
    with pytest.raises(ValueError):
        ContactCreate(
            name="N" * 151,
            department="IT",
            phone="(11) 98765-4321",
            email="valid@example.com",
            company_id=uuid.uuid4(),
        )


def test_contact_update_schema_rejects_values_over_database_column_limits() -> None:
    for field, value in (
        ("name", "N" * 151),
        ("department", "D" * 101),
        ("email", f"{'a' * 244}@example.com"),
    ):
        with pytest.raises(ValueError):
            ContactUpdate(**{field: value})


def test_contact_schema_accepts_values_at_database_column_limits() -> None:
    ContactCreate(
        name="N" * 150,
        department="D" * 100,
        phone="(11) 98765-4321",
        email=f"{'a' * 64}@{'b' * 63}.{'c' * 63}.{'d' * 57}.com",
        company_id=uuid.uuid4(),
    )

    with pytest.raises(ValueError):
        ContactCreate(
            name="John Doe",
            department="D" * 101,
            phone="(11) 98765-4321",
            email="valid@example.com",
            company_id=uuid.uuid4(),
        )

    with pytest.raises(ValueError):
        ContactCreate(
            name="John Doe",
            department="IT",
            phone="(11) 98765-4321",
            email=f"{'a' * 244}@example.com",
            company_id=uuid.uuid4(),
        )


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
