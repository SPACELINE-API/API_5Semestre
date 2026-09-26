import uuid

from sqlalchemy.orm import Session, joinedload

from app.modules.translators.models.language_pair import LanguagePair, TranslatorLanguagePair
from app.modules.translators.models.qualification import (
    TechnicalQualification,
)
from app.modules.translators.models.translator import Translator
from app.modules.translators.schemas.translator import LanguagePairInput


class TranslatorRepository:
    def __init__(self, db: Session):
        self.db = db

    # BUSCA TRADUTOR POR ID
    def get_by_id(self, translator_id: uuid.UUID) -> Translator | None:
        return (
            self.db.query(Translator)
            .options(
                joinedload(Translator.language_pairs).joinedload(
                    TranslatorLanguagePair.language_pair
                ),
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
                joinedload(Translator.language_pairs).joinedload(
                    TranslatorLanguagePair.language_pair
                ),
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

    # BUSCA PARES DE IDIOMA PELOS IDS
    def get_language_pairs_by_ids(self, ids: list[uuid.UUID]) -> list[LanguagePair]:
        if not ids:
            return []
        return self.db.query(LanguagePair).filter(LanguagePair.id.in_(ids)).all()

    # CRIA O TRADUTOR COM QUALIFICACOES E PARES EM UMA UNICA TRANSACAO
    def create(
        self,
        name: str,
        email: str,
        phone: str,
        qualifications: list[TechnicalQualification],
        pairs_input: list[LanguagePairInput],
    ) -> Translator:
        translator = Translator(name=name, email=email, phone=phone)
        translator.qualifications = qualifications

        self.db.add(translator)
        self.db.flush()

        for pair in pairs_input:
            self.db.add(
                TranslatorLanguagePair(
                    translator_id=translator.id,
                    language_pair_id=pair.language_pair_id,
                    proficiency_level=pair.proficiency_level,
                )
            )

        self.db.commit()
        return self.get_by_id(translator.id) or translator

    # ATUALIZA TRADUTOR SUBSTITUINDO QUALIFICACOES E PARES DE IDIOMA
    def update(
        self,
        translator: Translator,
        name: str,
        email: str,
        phone: str,
        qualifications: list[TechnicalQualification],
        pairs_input: list[LanguagePairInput],
    ) -> Translator:
        translator.name = name
        translator.email = email
        translator.phone = phone
        translator.qualifications = qualifications

        # REMOVE PARES ANTIGOS E INSERE OS NOVOS
        self.db.query(TranslatorLanguagePair).filter(
            TranslatorLanguagePair.translator_id == translator.id
        ).delete()

        for pair in pairs_input:
            self.db.add(
                TranslatorLanguagePair(
                    translator_id=translator.id,
                    language_pair_id=pair.language_pair_id,
                    proficiency_level=pair.proficiency_level,
                )
            )

        self.db.commit()
        return self.get_by_id(translator.id) or translator

    # REMOVE O TRADUTOR DO BANCO
    def delete(self, translator: Translator) -> None:
        self.db.delete(translator)
        self.db.commit()
