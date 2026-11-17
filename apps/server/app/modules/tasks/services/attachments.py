import mimetypes
import uuid

from fastapi import HTTPException

from app.modules.translators.services import storage

# BUCKET PRIVADO: O ACESSO AOS ANEXOS SO ACONTECE POR URL ASSINADA
TASK_ATTACHMENT_BUCKET = "task-attachments"
TASK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
TASK_ATTACHMENT_MAX_COUNT = 10
TASK_ATTACHMENT_EXTENSIONS = frozenset(
    {"pdf", "doc", "docx", "odt", "rtf", "txt", "xls", "xlsx", "png", "jpg", "jpeg"}
)


def validate_attachment(filename: str, content: bytes) -> None:
    if not content:
        raise HTTPException(status_code=422, detail="O anexo está vazio.")

    if len(content) > TASK_ATTACHMENT_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(f"O anexo excede o limite de {TASK_ATTACHMENT_MAX_BYTES // (1024 * 1024)} MB."),
        )

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in TASK_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail="Formato inválido. Envie PDF, Word, planilha, texto ou imagem.",
        )


def resolve_content_type(filename: str, declared_type: str | None) -> str:
    if declared_type and declared_type != "application/octet-stream":
        return declared_type
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def build_attachment_path(task_id: uuid.UUID, filename: str) -> str:
    return storage.build_object_path(task_id, filename)


def upload_attachment(object_path: str, content: bytes, content_type: str) -> None:
    storage.upload_object(TASK_ATTACHMENT_BUCKET, object_path, content, content_type)


def delete_attachment(object_path: str) -> None:
    storage.delete_object(TASK_ATTACHMENT_BUCKET, object_path)


def signed_attachment_url(object_path: str) -> str:
    return storage.create_signed_url(TASK_ATTACHMENT_BUCKET, object_path)
