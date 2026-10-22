import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_language import (
    ProficiencyLevel,
    TranslatorLanguage,
)
from app.modules.translators.schemas.translator import TranslatorProfileUpdate
from app.modules.translators.services.profile_service import TranslatorProfileService


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


@pytest.fixture
def translator(db_session):
    db_session.add(Language(id="pt-BR", name="Português"))
    db_session.flush()
    item = Translator(
        name="Tradutora Perfil",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="(11) 98765-4321",
    )
    item.languages = [
        TranslatorLanguage(language_id="pt-BR", proficiency_level=ProficiencyLevel.NATIVE)
    ]
    db_session.add(item)
    db_session.commit()
    return item


def test_get_profile_matches_authenticated_email_ignoring_case(db_session, translator):
    profile = TranslatorProfileService(db_session).get_profile(translator.email.upper())

    assert profile.id == translator.id
    assert profile.name == "Tradutora Perfil"
    assert [language.language_id for language in profile.languages] == ["pt-BR"]
    assert profile.photo_url is None


def test_get_profile_of_user_without_translator_is_404(db_session):
    with pytest.raises(HTTPException) as error:
        TranslatorProfileService(db_session).get_profile("ninguem@translators.com")

    assert error.value.status_code == 404


def test_update_profile_changes_name_and_phone_but_not_email(db_session, translator):
    original_email = translator.email

    profile = TranslatorProfileService(db_session).update_profile(
        original_email,
        TranslatorProfileUpdate(name="  Nome Novo  ", phone="(21) 91234-5678"),
    )

    assert profile.name == "Nome Novo"
    assert profile.phone == "(21) 91234-5678"
    assert profile.email == original_email


def test_profile_update_rejects_blank_name_and_short_phone():
    with pytest.raises(ValidationError):
        TranslatorProfileUpdate(name="   ", phone="(21) 91234-5678")

    with pytest.raises(ValidationError):
        TranslatorProfileUpdate(name="Nome", phone="123")
