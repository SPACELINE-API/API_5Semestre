import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.supabase_admin_client import SupabaseAdminClient
from app.modules.internal_users.services.identity_rules import email_used_by_translator_or_user
from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.qualification import TechnicalQualification
from app.modules.translators.models.translator import Translator
from app.modules.translators.repositories.translator_repository import TranslatorRepository
from app.modules.translators.schemas.translator import (
    TranslatorCreate,
    TranslatorLanguageInput,
    TranslatorResponse,
    TranslatorStatusUpdate,
    TranslatorUpdate,
)
from app.modules.translators.services.certificate_service import TranslatorCertificateService
from app.modules.translators.services.translator_account_service import (
    EMAIL_ALREADY_REGISTERED,
    TranslatorAccountService,
)


class TranslatorService:
    def __init__(self, db: Session, admin_client: SupabaseAdminClient | None = None):
        self.db = db
        self.repo = TranslatorRepository(db)
        self.certificates = TranslatorCertificateService(db)
        self.accounts = TranslatorAccountService(db, admin_client)

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

    # O CADASTRO CRIA O TRADUTOR E A CONTA DE ACESSO JUNTOS E ENVIA O LINK DE DEFINICAO DE SENHA
    def create(
        self, data: TranslatorCreate, actor: SupabaseAuthenticatedUser
    ) -> TranslatorResponse:
        # O E-MAIL E UNICO ENTRE TRADUTORES E QUALQUER CONTA DE ACESSO
        if email_used_by_translator_or_user(self.db, data.email):
            raise HTTPException(status_code=400, detail=EMAIL_ALREADY_REGISTERED)

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_languages(data.languages)

        translator = self.repo.create(
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            languages_input=data.languages,
            commit=False,
        )
        translator_id = translator.id
        self.accounts.open_account(translator, actor)
        return self.get(translator_id)

    def resend_password_link(
        self, translator_id: uuid.UUID, actor: SupabaseAuthenticatedUser
    ) -> TranslatorResponse:
        translator = self._get_translator_or_404(translator_id)
        self.accounts.resend_link(translator, actor)
        return self.present(translator)

    def get(self, translator_id: uuid.UUID) -> TranslatorResponse:
        return self.present(self._get_translator_or_404(translator_id))

    def list_all(self) -> list[TranslatorResponse]:
        return self.present_many(self.repo.list_all())

    def present(self, translator: Translator) -> TranslatorResponse:
        return self.present_many([translator])[0]

    def present_many(self, translators: list[Translator]) -> list[TranslatorResponse]:
        accounts = self.accounts.accounts_by_email([translator.email for translator in translators])
        self.db.commit()
        return [
            TranslatorResponse.model_validate(translator).model_copy(
                update={"account": accounts.get(translator.email.lower())}
            )
            for translator in translators
        ]

    def list_qualifications(self) -> list[TechnicalQualification]:
        return self.repo.list_qualifications()

    def update(
        self,
        translator_id: uuid.UUID,
        data: TranslatorUpdate,
        actor: SupabaseAuthenticatedUser,
    ) -> TranslatorResponse:
        translator = self._get_translator_or_404(translator_id)
        old_email = translator.email
        email_changed = data.email != old_email.lower()

        # Se o e-mail mudou, valida se já não está em uso por outro tradutor ou conta
        if email_changed:
            account = self.accounts.find_account(old_email)
            if email_used_by_translator_or_user(
                self.db, data.email, exclude_user_id=account.id if account else None
            ):
                raise HTTPException(status_code=400, detail=EMAIL_ALREADY_REGISTERED)

        qualifications = self._validate_qualifications(data.qualification_ids)
        self._validate_languages(data.languages)

        if email_changed:
            self.accounts.change_email(old_email, data.email, actor)
        self.accounts.sync_profile(data.email, data.name, data.phone)

        updated = self.repo.update(
            translator=translator,
            name=data.name,
            email=data.email,
            phone=data.phone,
            qualifications=qualifications,
            languages_input=data.languages,
        )
        return self.present(updated)

    def update_status(
        self, translator_id: uuid.UUID, data: TranslatorStatusUpdate
    ) -> TranslatorResponse:
        translator = self._get_translator_or_404(translator_id)
        return self.present(self.repo.update_status(translator, data.is_active))

    def delete(
        self, translator_id: uuid.UUID, actor: SupabaseAuthenticatedUser | None = None
    ) -> None:
        translator = self._get_translator_or_404(translator_id)
        certificate_paths = self.certificates.repo.list_storage_paths(translator.id)
        self.accounts.close_account(translator.email, actor)
        self.repo.delete(translator)
        # OS ARQUIVOS SO SAEM DO STORAGE DEPOIS QUE O TRADUTOR FOI REMOVIDO DO BANCO
        self.certificates.discard_files(certificate_paths)
