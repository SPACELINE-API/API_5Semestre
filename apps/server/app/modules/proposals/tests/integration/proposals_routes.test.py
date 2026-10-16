from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.models.user import User
from app.modules.quotes.models.additional_service import AdditionalService
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.shared.database import get_db


def _seed_roles_and_permission(db: Session) -> dict[str, uuid.UUID]:
    role_ids: dict[str, uuid.UUID] = {}
    for role_name, description in (
        ("Administrador", "Administra usuários, roles e permissões."),
        ("Operador", "Possui as mesmas permissões operacionais do administrador."),
        ("Projetos", "Gerencia projetos e orçamentos."),
        ("Financeiro", "Acessa informações financeiras autorizadas."),
        ("Atendimento", "Atende clientes e acompanha solicitações."),
        ("Recursos externos", "Acessa tarefas e documentos atribuídos."),
    ):
        role_id = uuid.uuid4()
        db.execute(
            text(
                """
                INSERT INTO roles (id, name, description, is_active)
                VALUES (:id, :name, :description, TRUE)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    updated_at = NOW()
                RETURNING id
                """
            ),
            {"id": role_id, "name": role_name, "description": description},
        )
        row = db.execute(
            text("SELECT id FROM roles WHERE name = :name"), {"name": role_name}
        ).fetchone()
        role_ids[role_name] = row[0]

    db.execute(
        text(
            """
            INSERT INTO permissions (id, code)
            VALUES (gen_random_uuid(), 'proposals.read')
            ON CONFLICT (code) DO NOTHING
            """
        )
    )
    for role_name in ("Administrador", "Projetos"):
        db.execute(
            text(
                """
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT roles.id, permissions.id
                FROM roles, permissions
                WHERE roles.name = :role_name AND permissions.code = 'proposals.read'
                ON CONFLICT DO NOTHING
                """
            ),
            {"role_name": role_name},
        )
    db.flush()
    return role_ids


def _create_user_with_role(
    db: Session, email: str, role_name: str, role_ids: dict[str, uuid.UUID]
) -> User:
    user = User(
        email=email,
        password_hash="hashed",
        is_active=True,
        role=role_name.lower(),
    )
    db.add(user)
    db.flush()
    role_id = role_ids[role_name]
    db.execute(
        text(
            "INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid) ON CONFLICT DO NOTHING"
        ),
        {"uid": user.id, "rid": role_id},
    )
    db.flush()
    return user


def _create_approved_request_with_quote(
    db: Session,
    *,
    quote_status: str = "pending",
    created_at: datetime | None = None,
) -> Quote:
    req = Request(
        customer_name="Cliente Teste",
        enterprise="Empresa Teste",
        email="cliente@teste.com",
        original_language="Português",
        translation_language="Inglês",
        customer_need="Contrato social",
        status=StatusEnum.APPROVED,
    )
    db.add(req)
    db.flush()

    quote = Quote(
        request_id=req.id,
        customer_name=req.customer_name,
        enterprise=req.enterprise,
        email=req.email,
        original_language=req.original_language,
        translation_language=req.translation_language,
        customer_need=req.customer_need,
        status=quote_status,
        company_id=None,
        contact_id=None,
    )
    db.add(quote)
    db.flush()

    if created_at is not None:
        db.execute(
            text("UPDATE quotes SET created_at = :ts WHERE id = :id"),
            {"ts": created_at, "id": quote.id},
        )
        db.flush()

    return quote


def _create_pending_request_with_quote(db: Session) -> Quote:
    req = Request(
        customer_name="Pendente",
        enterprise="Empresa Pendente",
        email="pendente@teste.com",
        original_language="Inglês",
        translation_language="Espanhol",
        customer_need="Manual técnico",
        status=StatusEnum.PENDING,
    )
    db.add(req)
    db.flush()
    quote = Quote(
        request_id=req.id,
        customer_name=req.customer_name,
        enterprise=req.enterprise,
        email=req.email,
        original_language=req.original_language,
        translation_language=req.translation_language,
        customer_need=req.customer_need,
        status="pending",
    )
    db.add(quote)
    db.flush()
    return quote


@pytest.fixture()
def db_with_roles(isolated_db_session: Session):
    role_ids = _seed_roles_and_permission(isolated_db_session)
    yield isolated_db_session, role_ids


@pytest.fixture()
def api_client(db_with_roles):
    db, role_ids = db_with_roles
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app), db, role_ids
    app.dependency_overrides.pop(get_db, None)


def test_seed_provisions_proposals_read_for_administrador_and_projetos(
    db_with_roles,
) -> None:
    db, role_ids = db_with_roles
    rows = db.execute(
        text(
            """
            SELECT r.name
            FROM roles r
            JOIN role_permissions rp ON rp.role_id = r.id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE p.code = 'proposals.read'
            ORDER BY r.name
            """
        )
    ).fetchall()
    role_names = {row[0] for row in rows}
    assert role_names == {"Administrador", "Projetos"}


@pytest.mark.parametrize("role_name", ["Administrador", "Projetos"])
def test_authorized_roles_get_200(api_client, role_name: str) -> None:
    from app.modules.auth.dependencies.dependencies import get_current_user
    from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser

    client, db, role_ids = api_client
    email = f"{role_name.lower().replace(' ', '_')}@test.com"
    _create_user_with_role(db, email, role_name, role_ids)

    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email=email
    )
    try:
        response = client.get("/api/quotes/proposals")
        assert response.status_code == 200, response.text
        body = response.json()
        assert "items" in body
        assert "total" in body
        assert "page" in body
        assert "page_size" in body
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.parametrize(
    "role_name",
    ["Operador", "Financeiro", "Atendimento", "Recursos externos"],
)
def test_unauthorized_roles_get_403(api_client, role_name: str) -> None:
    from app.modules.auth.dependencies.dependencies import get_current_user
    from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser

    client, db, role_ids = api_client
    email = f"noperm_{role_name.lower().replace(' ', '_')}@test.com"
    _create_user_with_role(db, email, role_name, role_ids)

    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email=email
    )
    try:
        response = client.get("/api/quotes/proposals")
        assert response.status_code == 403, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_unauthenticated_gets_401(api_client) -> None:
    from app.modules.auth.dependencies.dependencies import get_current_user

    client, db, role_ids = api_client
    app.dependency_overrides.pop(get_current_user, None)
    response = client.get("/api/quotes/proposals")
    assert response.status_code == 401, response.text


def _setup_authorized_client(api_client):
    from app.modules.auth.dependencies.dependencies import get_current_user
    from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser

    client, db, role_ids = api_client
    email = "projetos_filter@test.com"
    _create_user_with_role(db, email, "Projetos", role_ids)
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email=email
    )
    return client, db


def test_date_filter_returns_proposals_in_range(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    today = date.today()
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)

    _create_approved_request_with_quote(
        db, created_at=datetime(today.year, today.month, today.day, 12, 0, tzinfo=UTC)
    )
    _create_approved_request_with_quote(
        db,
        created_at=datetime(last_week.year, last_week.month, last_week.day, 12, 0, tzinfo=UTC),
    )

    response = client.get(
        "/api/quotes/proposals",
        params={"start_date": str(yesterday), "end_date": str(today)},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


def test_date_filter_boundary_includes_exact_dates(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    target_day = date(2025, 6, 15)
    _create_approved_request_with_quote(
        db,
        created_at=datetime(target_day.year, target_day.month, target_day.day, 0, 0, 0, tzinfo=UTC),
    )

    response = client.get(
        "/api/quotes/proposals",
        params={"start_date": str(target_day), "end_date": str(target_day)},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_inverted_date_range_returns_422(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    response = client.get(
        "/api/quotes/proposals",
        params={"start_date": "2025-12-31", "end_date": "2025-01-01"},
    )
    assert response.status_code == 422, response.text


def test_status_filter_returns_only_matching_proposals(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    _create_approved_request_with_quote(db, quote_status="approved")
    _create_approved_request_with_quote(db, quote_status="reproved")
    _create_approved_request_with_quote(db, quote_status="pending")

    for status_val, expected_count in (("approved", 1), ("reproved", 1), ("pending", 1)):
        response = client.get("/api/quotes/proposals", params={"status": status_val})
        assert response.status_code == 200, response.text
        assert response.json()["total"] == expected_count, f"Failed for status={status_val}"


def test_status_filter_combined_with_date(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    today = date.today()
    last_week = today - timedelta(days=7)

    _create_approved_request_with_quote(
        db,
        quote_status="approved",
        created_at=datetime(today.year, today.month, today.day, 10, 0, tzinfo=UTC),
    )
    _create_approved_request_with_quote(
        db,
        quote_status="reproved",
        created_at=datetime(today.year, today.month, today.day, 10, 0, tzinfo=UTC),
    )
    _create_approved_request_with_quote(
        db,
        quote_status="approved",
        created_at=datetime(last_week.year, last_week.month, last_week.day, 10, 0, tzinfo=UTC),
    )

    response = client.get(
        "/api/quotes/proposals",
        params={"status": "approved", "start_date": str(today), "end_date": str(today)},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_only_proposals_from_approved_requests_are_returned(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    _create_approved_request_with_quote(db)
    _create_pending_request_with_quote(db)

    response = client.get("/api/quotes/proposals")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_pagination_large_volume(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    n = 25
    for _ in range(n):
        _create_approved_request_with_quote(db)

    resp1 = client.get("/api/quotes/proposals", params={"page": 1, "page_size": 10})
    assert resp1.status_code == 200
    body1 = resp1.json()
    assert body1["total"] == n
    assert len(body1["items"]) == 10
    assert body1["page"] == 1
    assert body1["page_size"] == 10

    resp3 = client.get("/api/quotes/proposals", params={"page": 3, "page_size": 10})
    assert resp3.status_code == 200
    body3 = resp3.json()
    assert len(body3["items"]) == 5

    ids_p1 = {item["id"] for item in body1["items"]}
    ids_p2 = {
        item["id"]
        for item in client.get("/api/quotes/proposals", params={"page": 2, "page_size": 10}).json()[
            "items"
        ]
    }
    ids_p3 = {item["id"] for item in body3["items"]}
    assert not (ids_p1 & ids_p2), "Overlap between page 1 and page 2"
    assert not (ids_p1 & ids_p3), "Overlap between page 1 and page 3"
    assert not (ids_p2 & ids_p3), "Overlap between page 2 and page 3"


def test_page_size_above_limit_returns_422(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    response = client.get("/api/quotes/proposals", params={"page_size": 101})
    assert response.status_code == 422, response.text


def test_page_below_minimum_returns_422(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    response = client.get("/api/quotes/proposals", params={"page": 0})
    assert response.status_code == 422, response.text


def test_ordering_by_valid_field_asc(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    for i in range(3):
        _create_approved_request_with_quote(
            db,
            quote_status="pending",
            created_at=datetime(2025, 1, i + 1, 0, 0, tzinfo=UTC),
        )

    response = client.get(
        "/api/quotes/proposals", params={"order_by": "created_at", "order_dir": "asc"}
    )
    assert response.status_code == 200
    items = response.json()["items"]
    dates = [item["created_at"] for item in items]
    assert dates == sorted(dates)


def test_ordering_by_invalid_field_returns_422(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    response = client.get("/api/quotes/proposals", params={"order_by": "hacker_field"})
    assert response.status_code == 422, response.text


def test_invalid_order_dir_returns_422(api_client) -> None:
    client, db = _setup_authorized_client(api_client)

    response = client.get("/api/quotes/proposals", params={"order_dir": "RANDOM"})
    assert response.status_code == 422, response.text


def test_response_contains_required_fields(api_client) -> None:
    client, db = _setup_authorized_client(api_client)
    _create_approved_request_with_quote(db)

    response = client.get("/api/quotes/proposals")
    assert response.status_code == 200
    item = response.json()["items"][0]
    for field in (
        "id",
        "customer_name",
        "enterprise",
        "translation_service",
        "total_value",
        "status",
        "created_at",
    ):
        assert field in item, f"Missing field: {field}"


def test_total_value_includes_additional_services(api_client) -> None:
    client, db = _setup_authorized_client(api_client)
    quote = _create_approved_request_with_quote(db)
    quote.items.append(
        QuoteTranslationItem(
            source_language="pt",
            target_language="en",
            estimated_value=120,
        )
    )
    db.add(
        AdditionalService(
            quote_id=quote.id,
            description="Apostila urgente",
            price=30,
            status="pending",
        )
    )
    db.flush()

    response = client.get("/api/quotes/proposals")

    assert response.status_code == 200
    assert response.json()["items"][0]["total_value"] == "150.00"
