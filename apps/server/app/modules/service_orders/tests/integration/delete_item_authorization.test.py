import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.shared.database import get_db


def _create_item(db: Session) -> tuple[ServiceOrder, ServiceOrderItem]:
    company = Company(
        legal_name="Empresa de Teste Ltda",
        trade_name="Empresa de Teste",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        industry="juridico",
        phone="11987654321",
        email=f"cliente-{uuid.uuid4().hex[:10]}@example.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    db.add(company)
    db.flush()
    order = ServiceOrder(company_id=company.id, project_name="Projeto de teste")
    db.add(order)
    db.flush()
    item = ServiceOrderItem(
        service_order_id=order.id,
        source_language="pt-BR",
        target_language="en-US",
        translator_id=None,
    )
    db.add(item)
    db.commit()
    db.refresh(order)
    db.refresh(item)
    return order, item


def _authenticate(db: Session, permissions: list[str]) -> None:
    user_id = uuid.uuid4()
    role = Role(
        name=f"Role {uuid.uuid4().hex[:8]}",
        permissions=[Permission(code=code) for code in permissions],
    )
    user = User(
        id=user_id,
        email=f"operador-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="unused",
        role="legacy",
        roles=[role],
    )
    db.add(user)
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(user_id), email=user.email
    )


def test_delete_service_order_item_requires_authentication(client: TestClient) -> None:
    response = client.delete(f"/api/service-orders/{uuid.uuid4()}/items/{uuid.uuid4()}")

    assert response.status_code == 401


def test_delete_service_order_item_rejects_user_without_write_permission(
    client: TestClient, isolated_db_session: Session
) -> None:
    order, item = _create_item(isolated_db_session)
    _authenticate(isolated_db_session, ["service_orders.read"])

    try:
        response = client.delete(f"/api/service-orders/{order.id}/items/{item.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


def test_delete_service_order_item_allows_user_with_write_permission(
    client: TestClient, isolated_db_session: Session
) -> None:
    order, item = _create_item(isolated_db_session)
    _authenticate(isolated_db_session, ["service_orders.write"])

    try:
        response = client.delete(f"/api/service-orders/{order.id}/items/{item.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 204
    assert isolated_db_session.get(ServiceOrderItem, item.id) is None
