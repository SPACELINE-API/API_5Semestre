import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_language import (
    ProficiencyLevel,
    TranslatorLanguage,
)
from app.modules.translators.routes import translators_write_permission
from app.shared.database import get_db


def test_translator_status_endpoint_deactivates_and_reactivates_persistently(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    translator = Translator(
        id=uuid.uuid4(),
        name="Tradutor de teste",
        email=f"tradutor-{uuid.uuid4()}@example.com",
        phone="11999990000",
        is_active=True,
    )
    db.add(translator)
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[translators_write_permission] = lambda: None
    try:
        client = TestClient(app)

        deactivated = client.patch(
            f"/api/translators/{translator.id}/status",
            json={"is_active": False},
        )

        assert deactivated.status_code == 200
        assert deactivated.json()["is_active"] is False
        db.refresh(translator)
        assert translator.is_active is False

        reactivated = client.patch(
            f"/api/translators/{translator.id}/status",
            json={"is_active": True},
        )

        assert reactivated.status_code == 200
        assert reactivated.json()["is_active"] is True
        db.refresh(translator)
        assert translator.is_active is True
    finally:
        app.dependency_overrides.pop(translators_write_permission, None)
        app.dependency_overrides.pop(get_db, None)


def test_deactivating_translator_then_saving_profile_keeps_status_inactive(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    db.add(Language(id="pt-BR", name="Português"))
    translator = Translator(
        id=uuid.uuid4(),
        name="Tradutor antes da edição",
        email=f"tradutor-{uuid.uuid4()}@example.com",
        phone="11999990000",
        is_active=True,
    )
    db.add(translator)
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[translators_write_permission] = lambda: None
    try:
        client = TestClient(app)
        status_response = client.patch(
            f"/api/translators/{translator.id}/status",
            json={"is_active": False},
        )

        assert status_response.status_code == 200
        assert status_response.json()["is_active"] is False

        profile_response = client.put(
            f"/api/translators/{translator.id}",
            json={
                "name": "Tradutor editado",
                "email": translator.email,
                "phone": "11988887777",
                "qualification_ids": [],
                "languages": [{"language_id": "pt-BR", "proficiency_level": "native"}],
            },
        )

        assert profile_response.status_code == 200
        assert profile_response.json()["name"] == "Tradutor editado"
        assert profile_response.json()["is_active"] is False
        db.refresh(translator)
        assert translator.is_active is False
    finally:
        app.dependency_overrides.pop(translators_write_permission, None)
        app.dependency_overrides.pop(get_db, None)


def test_existing_language_survives_profile_updates_and_status_can_be_toggled(
    isolated_db_session: Session,
) -> None:
    db = isolated_db_session
    language = Language(id="sq-AL", name="Albanês")
    translator = Translator(
        id=uuid.uuid4(),
        name="Tradutor antes da edição",
        email=f"tradutor-{uuid.uuid4()}@example.com",
        phone="11999990000",
        is_active=True,
    )
    translator.languages = [
        TranslatorLanguage(
            language=language,
            proficiency_level=ProficiencyLevel.ADVANCED,
        )
    ]
    db.add(translator)
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[translators_write_permission] = lambda: None
    try:
        client = TestClient(app)
        update_payload = {
            "name": "Tradutor editado",
            "email": translator.email,
            "phone": "11988887777",
            "qualification_ids": [],
            "languages": [
                {"language_id": "sq-AL", "proficiency_level": "advanced"}
            ],
        }

        updated = client.put(
            f"/api/translators/{translator.id}",
            json=update_payload,
        )

        assert updated.status_code == 200
        assert updated.json()["name"] == "Tradutor editado"
        assert updated.json()["is_active"] is True
        assert [item["language_id"] for item in updated.json()["languages"]] == [
            "sq-AL"
        ]

        deactivated = client.patch(
            f"/api/translators/{translator.id}/status",
            json={"is_active": False},
        )
        assert deactivated.status_code == 200
        assert deactivated.json()["is_active"] is False

        update_payload["phone"] = "11977776666"
        saved_while_inactive = client.put(
            f"/api/translators/{translator.id}",
            json=update_payload,
        )
        assert saved_while_inactive.status_code == 200
        assert saved_while_inactive.json()["is_active"] is False
        assert saved_while_inactive.json()["phone"] == "11977776666"

        reactivated = client.patch(
            f"/api/translators/{translator.id}/status",
            json={"is_active": True},
        )
        assert reactivated.status_code == 200
        assert reactivated.json()["is_active"] is True
        db.refresh(translator)
        assert translator.is_active is True
        assert [item.language_id for item in translator.languages] == ["sq-AL"]
    finally:
        app.dependency_overrides.pop(translators_write_permission, None)
        app.dependency_overrides.pop(get_db, None)
