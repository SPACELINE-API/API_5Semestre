import uuid

from sqlalchemy.orm import Session, joinedload

from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.qualification import (
    TechnicalQualification,
)
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_language import TranslatorLanguage
from app.modules.translators.schemas.translator import TranslatorLanguageInput


class TranslatorRepository:
    def __init__(self, db: Session):
        self.db = db

    # BUSCA TRADUTOR POR ID
    def get_by_id(self, translator_id: uuid.UUID) -> Translator | None:
        return (
            self.db.query(Translator)
            .options(
                joinedload(Translator.languages).joinedload(TranslatorLanguage.language),
                joinedload(Translator.qualifications),
            )
            .filter(Translator.id == translator_id)
            .first()
        )

    # BUSCA TRADUTOR POR EMAIL
    def get_by_email(self, email: str) -> Translator | None:
        return self.db.query(Translator).filter(Translator.email == email).first()

    # LISTA TODOS OS TRADUTORES
    def list_all(self) -> list[Translator]:
        return (
            self.db.query(Translator)
            .options(
                joinedload(Translator.languages).joinedload(TranslatorLanguage.language),
                joinedload(Translator.qualifications),
            )
            .all()
        )

    # BUSCA QUALIFICACOES PELOS IDS
    def get_qualifications_by_ids(self, ids: list[uuid.UUID]) -> list[TechnicalQualification]:
        if not ids:
            return []
        return (
            self.db.query(TechnicalQualification).filter(TechnicalQualification.id.in_(ids)).all()
        )

    # BUSCA IDIOMAS PELOS CODIGOS
    def get_languages_by_ids(self, ids: list[str]) -> list[Language]:
        if not ids:
            return []
        return self.db.query(Language).filter(Language.id.in_(ids)).all()

    # LISTA TODAS AS QUALIFICACOES
    def list_qualifications(self) -> list[TechnicalQualification]:
        return self.db.query(TechnicalQualification).order_by(TechnicalQualification.name).all()

    # CRIA O TRADUTOR COM QUALIFICACOES E IDIOMAS EM UMA UNICA TRANSACAO
    def create(
        self,
        name: str,
        email: str,
        phone: str,
        qualifications: list[TechnicalQualification],
        languages_input: list[TranslatorLanguageInput],
    ) -> Translator:
        translator = Translator(name=name, email=email, phone=phone)
        translator.qualifications = qualifications
        translator.languages = [
            TranslatorLanguage(
                language_id=language_input.language_id,
                proficiency_level=language_input.proficiency_level,
            )
            for language_input in languages_input
        ]

        self.db.add(translator)
        self.db.commit()
        return self.get_by_id(translator.id) or translator

    # ATUALIZA TRADUTOR SUBSTITUINDO QUALIFICACOES E IDIOMAS
    def update(
        self,
        translator: Translator,
        name: str,
        email: str,
        phone: str,
        qualifications: list[TechnicalQualification],
        languages_input: list[TranslatorLanguageInput],
    ) -> Translator:
        translator.name = name
        translator.email = email
        translator.phone = phone
        translator.qualifications = qualifications
        translator.languages = [
            TranslatorLanguage(
                language_id=language_input.language_id,
                proficiency_level=language_input.proficiency_level,
            )
            for language_input in languages_input
        ]

        self.db.commit()
        return self.get_by_id(translator.id) or translator

    def update_status(self, translator: Translator, is_active: bool) -> Translator:
        translator.is_active = is_active
        self.db.commit()
        return self.get_by_id(translator.id) or translator

    # REMOVE O TRADUTOR DO BANCO
    def delete(self, translator: Translator) -> None:
        self.db.delete(translator)
        self.db.commit()
