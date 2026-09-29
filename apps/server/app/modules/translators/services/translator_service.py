import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.qualification import TechnicalQualification
from app.modules.translators.models.translator import Translator
from app.modules.translators.repositories.translator_repository import TranslatorRepository
from app.modules.translators.schemas.translator import (
    TranslatorCreate,
    TranslatorLanguageInput,
    TranslatorStatusUpdate,
    TranslatorUpdate,
)


class TranslatorService:
    def __init__(self, db: Session):
        self.repo = TranslatorRepository(db)

    def _get_translator_or_404(self, translator_id: uuid.UUID) -> Translator:
        translator = self.repo.get_by_id(translator_id)
        if not translator:
            raise HTTPException(status_code=404, detail="Translator not found")
        return translator

    def _validate_qualifications(self, ids: list[uuid.UUID]) -> list[TechnicalQualification]:
        if not ids:
            return []
        qualifications = self.repo.get_qualifications_by_ids(ids)
        if len(qualifications) != len(ids):
            raise HTTPException(
                status_code=422,
                detail="One or more technical qualifications not found",
            )
        return qualifications

    def _validate_languages(self, languages: list[TranslatorLanguageInput]) -> list[Language]:
        ids = [language.language_id for language in languages]
        found = self.repo.get_languages_by_ids(ids)
        if len(found) != len(ids):
            raise HTTPException(
                status_code=422,
                detail="One or more languages not found",
            )
        return found

    def create(self, data: TranslatorCreate) -> Translator:
        existing = self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_languages(data.languages)

        return self.repo.create(
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            languages_input=data.languages,
        )

    def get(self, translator_id: uuid.UUID) -> Translator:
        return self._get_translator_or_404(translator_id)

    def list_all(self) -> list[Translator]:
        return self.repo.list_all()

    def list_qualifications(self) -> list[TechnicalQualification]:
        return self.repo.list_qualifications()

    def update(self, translator_id: uuid.UUID, data: TranslatorUpdate) -> Translator:
        translator = self._get_translator_or_404(translator_id)

        # Se o e-mail mudou, valida se já não está em uso por outro tradutor
        if data.email != translator.email:
            existing = self.repo.get_by_email(data.email)
            if existing and existing.id != translator_id:
                raise HTTPException(status_code=400, detail="Email already registered")

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_languages(data.languages)

        return self.repo.update(
            translator=translator,
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            languages_input=data.languages,
        )

    def update_status(self, translator_id: uuid.UUID, data: TranslatorStatusUpdate) -> Translator:
        translator = self._get_translator_or_404(translator_id)
        return self.repo.update_status(translator, data.is_active)

    def delete(self, translator_id: uuid.UUID) -> None:
        translator = self._get_translator_or_404(translator_id)
        self.repo.delete(translator)
