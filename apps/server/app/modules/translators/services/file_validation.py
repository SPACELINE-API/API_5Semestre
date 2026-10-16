from dataclasses import dataclass

from fastapi import HTTPException

MEGABYTE = 1024 * 1024


@dataclass(frozen=True)
class UploadRules:
    label: str
    allowed_types: tuple[str, ...]
    max_bytes: int


PHOTO_RULES = UploadRules(
    label="foto",
    allowed_types=("image/jpeg", "image/png", "image/webp"),
    max_bytes=5 * MEGABYTE,
)


def _detect_content_type(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_upload(content: bytes, declared_type: str | None, rules: UploadRules) -> str:
    if not content:
        raise HTTPException(status_code=422, detail=f"O arquivo de {rules.label} está vazio.")

    if len(content) > rules.max_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"O arquivo de {rules.label} excede o limite de {rules.max_bytes // MEGABYTE} MB."
            ),
        )

    detected = _detect_content_type(content)
    if detected not in rules.allowed_types or (declared_type and declared_type != detected):
        raise HTTPException(
            status_code=422,
            detail=f"Formato inválido para {rules.label}. Envie um arquivo JPG, PNG ou WEBP.",
        )

    return detected
