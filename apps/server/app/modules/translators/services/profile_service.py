from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_language import TranslatorLanguage
from app.modules.translators.schemas.translator import (
    TranslatorProfileResponse,
    TranslatorProfileUpdate,
)
from app.modules.translators.services import storage
from app.modules.translators.services.file_validation import PHOTO_RULES, validate_upload


class TranslatorProfileService:
    def __init__(self, db: Session):
        self.db = db

    def get_translator(self, email: str) -> Translator:
        translator = (
            self.db.query(Translator)
            .options(
                joinedload(Translator.languages).joinedload(TranslatorLanguage.language),
                joinedload(Translator.qualifications),
            )
            .filter(Translator.email.ilike(email))
            .first()
        )
        if translator is None:
            raise HTTPException(
                status_code=404,
                detail="Nenhum perfil de tradutor está associado a este usuário.",
            )
        return translator

    def get_profile(self, email: str) -> TranslatorProfileResponse:
        return self.to_response(self.get_translator(email))

    def update_profile(
        self, email: str, data: TranslatorProfileUpdate
    ) -> TranslatorProfileResponse:
        translator = self.get_translator(email)
        translator.name = data.name
        translator.phone = data.phone
        self.db.commit()
        self.db.refresh(translator)
        return self.to_response(translator)

    def set_photo(
        self,
        email: str,
        filename: str,
        content: bytes,
        declared_type: str | None,
    ) -> TranslatorProfileResponse:
        translator = self.get_translator(email)
        content_type = validate_upload(content, declared_type, PHOTO_RULES)

        previous_path = translator.photo_path
        new_path = storage.build_object_path(translator.id, filename)
        storage.upload_object(storage.PHOTO_BUCKET, new_path, content, content_type)

        translator.photo_path = new_path
        translator.photo_filename = filename[:255]
        translator.photo_content_type = content_type
        translator.photo_size_bytes = len(content)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            storage.delete_object(storage.PHOTO_BUCKET, new_path)
            raise

        if previous_path:
            storage.delete_object(storage.PHOTO_BUCKET, previous_path)

        self.db.refresh(translator)
        return self.to_response(translator)

    def to_response(self, translator: Translator) -> TranslatorProfileResponse:
        photo_url = (
            storage.get_public_url(storage.PHOTO_BUCKET, translator.photo_path)
            if translator.photo_path
            else None
        )

        return TranslatorProfileResponse(
            id=translator.id,
            name=translator.name,
            email=translator.email,
            phone=translator.phone,
            is_active=translator.is_active,
            photo_url=photo_url,
            photo_filename=translator.photo_filename,
            photo_size_bytes=translator.photo_size_bytes,
            qualifications=translator.qualifications,
            languages=translator.languages,
        )
