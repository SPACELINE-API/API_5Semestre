import random
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.main import app
from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.shared.database import Base, get_database_url, get_db

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

    session.query(Contact).delete()
    session.query(Company).delete()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def make_company_payload(**overrides) -> dict:
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
    return data


def test_create_company_returns_201_and_company(client: TestClient) -> None:
    response = client.post("/api/clients", json=make_company_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["trade_name"] == "Acme Tech"
    assert body["is_active"] is True
    assert "id" in body


def test_create_company_duplicate_cnpj_returns_409(client: TestClient) -> None:
    payload = make_company_payload()
    client.post("/api/clients", json=payload)

    response = client.post("/api/clients", json=make_company_payload(cnpj=payload["cnpj"]))

    assert response.status_code == 409


def test_list_companies_returns_created_companies(client: TestClient) -> None:
    client.post("/api/clients", json=make_company_payload())
    client.post("/api/clients", json=make_company_payload())

    response = client.get("/api/clients")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_company_returns_matching_company(client: TestClient) -> None:
    created = client.post("/api/clients", json=make_company_payload()).json()

    response = client.get(f"/api/clients/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_company_returns_404_when_not_found(client: TestClient) -> None:
    response = client.get(f"/api/clients/{uuid.uuid4()}")

    assert response.status_code == 404


def test_update_company_changes_given_fields(client: TestClient) -> None:
    created = client.post("/api/clients", json=make_company_payload()).json()

    response = client.patch(f"/api/clients/{created['id']}", json={"trade_name": "Novo Nome"})

    assert response.status_code == 200
    body = response.json()
    assert body["trade_name"] == "Novo Nome"
    assert body["legal_name"] == created["legal_name"]


def test_update_company_can_deactivate(client: TestClient) -> None:
    created = client.post("/api/clients", json=make_company_payload()).json()

    response = client.patch(f"/api/clients/{created['id']}", json={"is_active": False})

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_update_company_returns_404_when_not_found(client: TestClient) -> None:
    response = client.patch(f"/api/clients/{uuid.uuid4()}", json={"trade_name": "X"})

    assert response.status_code == 404


def test_delete_company_returns_204_and_removes_it(client: TestClient) -> None:
    created = client.post("/api/clients", json=make_company_payload()).json()

    response = client.delete(f"/api/clients/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/clients/{created['id']}").status_code == 404


def test_delete_company_returns_404_when_not_found(client: TestClient) -> None:
    response = client.delete(f"/api/clients/{uuid.uuid4()}")

    assert response.status_code == 404
