import uuid

from sqlalchemy import select

from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.user import User
from app.modules.translators.models.translator import Translator


def audit_actions(env, user_id: str) -> list[str]:
    rows = env.db.scalars(
        select(AuthorizationAuditLog).where(AuthorizationAuditLog.target_id == uuid.UUID(user_id))
    ).all()
    return sorted(row.action for row in rows)


def test_create_internal_user_starts_inactive_with_roles_and_audit(env) -> None:
    projetos = env.role("Projetos", ("quotes.read",))
    financeiro = env.role("Financeiro", ("finance.read",))

    response = env.client.post(
        "/api/internal-users",
        json={
            "name": "  Ana   Souza ",
            "email": "Ana@Example.com",
            "phone": "11999990000",
            "role_ids": [str(projetos.id), str(financeiro.id)],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ana Souza"
    assert body["email"] == "ana@example.com"
    assert body["phone"] == "11999990000"
    assert body["is_active"] is False
    assert body["status"] == "inativa"
    assert body["password_defined"] is False
    assert body["latest_link"] is None
    assert [role["name"] for role in body["roles"]] == ["Financeiro", "Projetos"]
    assert body["permissions"] == ["finance.read", "quotes.read"]
    assert audit_actions(env, body["id"]) == ["internal_user_created"]
    stored = env.db.get(User, uuid.UUID(body["id"]))
    assert stored is not None and stored.password_set_at is None
    assert env.admin_client.users["ana@example.com"]["id"] == body["id"]


def test_create_rejects_translator_profile(env) -> None:
    for name in ("Tradutor", "Recursos externos"):
        role = env.role(name)
        response = env.client.post(
            "/api/internal-users",
            json={
                "name": "Ana",
                "email": f"{uuid.uuid4().hex}@example.com",
                "phone": "11999990000",
                "role_ids": [str(role.id)],
            },
        )
        assert response.status_code == 422
        assert "Tradutor" in response.json()["detail"]


def test_create_rejects_duplicate_and_missing_roles(env) -> None:
    projetos = env.role("Projetos")

    duplicated = env.client.post(
        "/api/internal-users",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "11999990000",
            "role_ids": [str(projetos.id), str(projetos.id)],
        },
    )
    empty = env.client.post(
        "/api/internal-users",
        json={"name": "Ana", "email": "ana@example.com", "phone": "11999990000", "role_ids": []},
    )
    unknown = env.client.post(
        "/api/internal-users",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "11999990000",
            "role_ids": [str(uuid.uuid4())],
        },
    )

    assert duplicated.status_code == 422
    assert empty.status_code == 422
    assert unknown.status_code == 404
    assert env.admin_client.users == {}


def test_create_rejects_inactive_role(env) -> None:
    role = env.role("Projetos", active=False)

    response = env.client.post(
        "/api/internal-users",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "11999990000",
            "role_ids": [str(role.id)],
        },
    )

    assert response.status_code == 422


def test_email_is_globally_unique_across_internal_users_and_translators(env) -> None:
    projetos = env.role("Projetos")
    env.create_person(projetos, email="ana@example.com")
    env.db.add(
        Translator(
            id=uuid.uuid4(), name="Tradutor", email="tradutor@example.com", phone="11999990000"
        )
    )
    env.db.flush()

    same_user_email = env.client.post(
        "/api/internal-users",
        json={
            "name": "Outra",
            "email": "ANA@example.com",
            "phone": "11999990000",
            "role_ids": [str(projetos.id)],
        },
    )
    translator_email = env.client.post(
        "/api/internal-users",
        json={
            "name": "Outra",
            "email": "tradutor@example.com",
            "phone": "11999990000",
            "role_ids": [str(projetos.id)],
        },
    )

    assert same_user_email.status_code == 409
    assert translator_email.status_code == 409


def test_translator_registration_rejects_email_of_internal_user(env) -> None:
    from app.modules.translators.routes import translators_write_permission

    projetos = env.role("Projetos")
    env.create_person(projetos, email="ana@example.com")
    app = env.client.app
    app.dependency_overrides[translators_write_permission] = lambda: None

    response = env.client.post(
        "/api/translators",
        json={
            "name": "Ana Tradutora",
            "email": "ana@example.com",
            "phone": "11999990000",
            "qualification_ids": [],
            "languages": [{"language_id": "en", "proficiency_level": "fluent"}],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_only_administrators_can_use_the_flow(env) -> None:
    projetos = env.role("Projetos", ("users.write", "users.read"))
    person = env.create_person(projetos)
    non_admin = User(
        id=uuid.uuid4(),
        email="projetos@example.com",
        password_hash="unused",
        role="interno",
        is_active=True,
        roles=[projetos],
    )
    env.db.add(non_admin)
    env.db.flush()
    env.act_as(non_admin)
    person_id = person["id"]

    responses = [
        env.client.post(
            "/api/internal-users",
            json={
                "name": "X",
                "email": "x@example.com",
                "phone": "11999990000",
                "role_ids": [str(projetos.id)],
            },
        ),
        env.client.get("/api/internal-users"),
        env.client.get(f"/api/internal-users/{person_id}"),
        env.client.patch(f"/api/internal-users/{person_id}", json={"name": "Novo"}),
        env.client.post(f"/api/internal-users/{person_id}/deactivate"),
        env.client.post(
            f"/api/internal-users/{person_id}/roles", json={"role_id": str(projetos.id)}
        ),
        env.client.delete(f"/api/internal-users/{person_id}/roles/{projetos.id}"),
        env.client.post(f"/api/internal-users/{person_id}/password-setup-link"),
        env.client.post(f"/api/internal-users/{person_id}/password-setup-link/resend"),
    ]

    assert [response.status_code for response in responses] == [403] * len(responses)


def test_list_and_detail_expose_only_internal_people(env) -> None:
    projetos = env.role("Projetos")
    financeiro = env.role("Financeiro")
    ana = env.create_person(projetos, email="ana@example.com", name="Ana")
    env.create_person(financeiro, email="bruno@example.com", name="Bruno")
    env.db.add(
        User(
            id=uuid.uuid4(),
            email="legado@example.com",
            password_hash="unused",
            role="tradutor",
            is_active=True,
        )
    )
    env.db.flush()

    everyone = env.client.get("/api/internal-users").json()
    by_search = env.client.get("/api/internal-users", params={"search": "bru"}).json()
    by_role = env.client.get("/api/internal-users", params={"role_id": str(projetos.id)}).json()
    by_status = env.client.get("/api/internal-users", params={"is_active": "false"}).json()
    detail = env.client.get(f"/api/internal-users/{ana['id']}")
    missing = env.client.get(f"/api/internal-users/{uuid.uuid4()}")

    assert [person["email"] for person in everyone] == [
        "admin@example.com",
        "ana@example.com",
        "bruno@example.com",
    ]
    assert [person["email"] for person in by_search] == ["bruno@example.com"]
    assert [person["email"] for person in by_role] == ["ana@example.com"]
    assert [person["email"] for person in by_status] == ["ana@example.com", "bruno@example.com"]
    assert detail.status_code == 200 and detail.json()["name"] == "Ana"
    assert missing.status_code == 404


def test_update_name_and_email_while_awaiting_password(env) -> None:
    projetos = env.role("Projetos")
    person = env.create_person(projetos)
    env.client.post(f"/api/internal-users/{person['id']}/password-setup-link")
    old_token = env.last_token()

    response = env.client.patch(
        f"/api/internal-users/{person['id']}",
        json={"name": "Ana Maria", "email": "ana.maria@example.com"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ana Maria"
    assert body["email"] == "ana.maria@example.com"
    assert body["latest_link"]["status"] == "rejeitado"
    assert "ana.maria@example.com" in env.admin_client.users
    assert "internal_user_updated" in audit_actions(env, person["id"])
    describe = env.client.get(f"/api/auth/password-setup/{old_token}")
    assert describe.json()["status"] == "rejeitado"


def test_update_rejects_email_taken_by_another_person_or_empty_payload(env) -> None:
    projetos = env.role("Projetos")
    env.create_person(projetos, email="ana@example.com")
    bruno = env.create_person(projetos, email="bruno@example.com", name="Bruno")

    taken = env.client.patch(
        f"/api/internal-users/{bruno['id']}", json={"email": "ana@example.com"}
    )
    empty = env.client.patch(f"/api/internal-users/{bruno['id']}", json={})

    assert taken.status_code == 409
    assert empty.status_code == 422


def test_deactivate_active_person_and_block_self_deactivation(env) -> None:
    projetos = env.role("Projetos")
    person = env.create_person(projetos)
    stored = env.db.get(User, uuid.UUID(person["id"]))
    stored.is_active = True
    env.db.flush()

    own = env.client.post(f"/api/internal-users/{env.actor.id}/deactivate")
    deactivated = env.client.post(f"/api/internal-users/{person['id']}/deactivate")
    again = env.client.post(f"/api/internal-users/{person['id']}/deactivate")

    assert own.status_code == 409
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert deactivated.json()["status"] == "inativa"
    assert again.status_code == 409
    assert "internal_user_deactivated" in audit_actions(env, person["id"])


def test_add_and_remove_roles_with_audit_and_guards(env) -> None:
    projetos = env.role("Projetos", ("quotes.read",))
    financeiro = env.role("Financeiro", ("finance.read",))
    tradutor = env.role("Tradutor")
    person = env.create_person(projetos)
    base = f"/api/internal-users/{person['id']}"

    added = env.client.post(f"{base}/roles", json={"role_id": str(financeiro.id)})
    duplicated = env.client.post(f"{base}/roles", json={"role_id": str(financeiro.id)})
    translator_role = env.client.post(f"{base}/roles", json={"role_id": str(tradutor.id)})
    unknown_role = env.client.post(f"{base}/roles", json={"role_id": str(uuid.uuid4())})
    removed = env.client.delete(f"{base}/roles/{financeiro.id}")
    not_assigned = env.client.delete(f"{base}/roles/{financeiro.id}")
    last_role = env.client.delete(f"{base}/roles/{projetos.id}")

    assert added.status_code == 201
    assert [role["name"] for role in added.json()["roles"]] == ["Financeiro", "Projetos"]
    assert duplicated.status_code == 409
    assert translator_role.status_code == 422
    assert unknown_role.status_code == 404
    assert removed.status_code == 200
    assert [role["name"] for role in removed.json()["roles"]] == ["Projetos"]
    assert not_assigned.status_code == 404
    assert last_role.status_code == 409
    assert audit_actions(env, person["id"]) == [
        "internal_user_created",
        "internal_user_role_added",
        "internal_user_role_removed",
    ]


def test_supabase_failure_does_not_create_local_person(env) -> None:
    projetos = env.role("Projetos")
    env.admin_client.fail = True

    response = env.client.post(
        "/api/internal-users",
        json={
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "11999990000",
            "role_ids": [str(projetos.id)],
        },
    )

    assert response.status_code == 502
    assert env.db.scalar(select(User).where(User.email == "ana@example.com")) is None


def test_phone_is_required_and_validated_on_create(env) -> None:
    projetos = env.role("Projetos")
    base = {"name": "Ana", "email": "ana@example.com", "role_ids": [str(projetos.id)]}

    missing = env.client.post("/api/internal-users", json=base)
    short = env.client.post("/api/internal-users", json={**base, "phone": "12345"})
    blank = env.client.post("/api/internal-users", json={**base, "phone": "   "})
    valid = env.client.post("/api/internal-users", json={**base, "phone": " (11) 99999-0000 "})

    assert missing.status_code == 422
    assert short.status_code == 422
    assert blank.status_code == 422
    assert valid.status_code == 201
    assert valid.json()["phone"] == "(11) 99999-0000"


def test_update_phone(env) -> None:
    person = env.create_person(env.role("Projetos"))

    updated = env.client.patch(
        f"/api/internal-users/{person['id']}", json={"phone": "(21) 98888-7777"}
    )
    invalid = env.client.patch(f"/api/internal-users/{person['id']}", json={"phone": "123"})

    assert updated.status_code == 200
    assert updated.json()["phone"] == "(21) 98888-7777"
    assert invalid.status_code == 422
    assert "internal_user_updated" in audit_actions(env, person["id"])
