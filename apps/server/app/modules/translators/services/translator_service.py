import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.translators.models.language_pair import LanguagePair
from app.modules.translators.models.qualification import TechnicalQualification
from app.modules.translators.models.translator import Translator
from app.modules.translators.repositories.translator_repository import TranslatorRepository
from app.modules.translators.schemas.translator import (
    LanguagePairInput,
    TranslatorCreate,
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

    def _validate_language_pairs(self, pairs: list[LanguagePairInput]) -> list[LanguagePair]:
        ids = [p.language_pair_id for p in pairs]
        found = self.repo.get_language_pairs_by_ids(ids)
        if len(found) != len(ids):
            raise HTTPException(
                status_code=422,
                detail="One or more language pairs not found",
            )
        return found

    def create(self, data: TranslatorCreate) -> Translator:
        existing = self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_language_pairs(data.language_pairs)

        return self.repo.create(
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            pairs_input=data.language_pairs,
        )

    def get(self, translator_id: uuid.UUID) -> Translator:
        return self._get_translator_or_404(translator_id)

    def list_all(self) -> list[Translator]:
        return self.repo.list_all()

    def update(self, translator_id: uuid.UUID, data: TranslatorUpdate) -> Translator:
        translator = self._get_translator_or_404(translator_id)

        # Se o e-mail mudou, valida se já não está em uso por outro tradutor
        if data.email != translator.email:
            existing = self.repo.get_by_email(data.email)
            if existing and existing.id != translator_id:
                raise HTTPException(status_code=400, detail="Email already registered")

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_language_pairs(data.language_pairs)

        return self.repo.update(
            translator=translator,
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            pairs_input=data.language_pairs,
        )

    def delete(self, translator_id: uuid.UUID) -> None:
        translator = self._get_translator_or_404(translator_id)
        self.repo.delete(translator)
