from dataclasses import dataclass

from fastapi import HTTPException

MEGABYTE = 1024 * 1024
# QUANTIDADE DE BYTES FINAIS ANALISADOS PARA CONFIRMAR QUE O ARQUIVO NAO FOI TRUNCADO
TRAILER_WINDOW = 1024


@dataclass(frozen=True)
class UploadRules:
    label: str
    allowed_types: tuple[str, ...]
    max_bytes: int
    formats_label: str
    require_complete_file: bool = False


PHOTO_RULES = UploadRules(
    label="foto",
    allowed_types=("image/jpeg", "image/png", "image/webp"),
    max_bytes=5 * MEGABYTE,
    formats_label="JPG, PNG ou WEBP",
)

CERTIFICATE_RULES = UploadRules(
    label="certificado",
    allowed_types=("application/pdf", "image/jpeg", "image/png"),
    max_bytes=10 * MEGABYTE,
    formats_label="PDF, JPG ou PNG",
    require_complete_file=True,
)

# MARCADORES QUE INDICAM O FIM DE UM ARQUIVO INTEGRO
_END_MARKERS = {
    "application/pdf": b"%%EOF",
    "image/png": b"IEND",
    "image/jpeg": b"\xff\xd9",
}


def _detect_content_type(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def _is_complete(content: bytes, content_type: str) -> bool:
    marker = _END_MARKERS.get(content_type)
    return marker is None or marker in content[-TRAILER_WINDOW:]


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
    if (
        detected is None
        or detected not in rules.allowed_types
        or (declared_type and declared_type != detected)
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Formato inválido para {rules.label}. Envie um arquivo {rules.formats_label}."
            ),
        )

    if rules.require_complete_file and not _is_complete(content, detected):
        raise HTTPException(
            status_code=422,
            detail=f"O arquivo de {rules.label} está corrompido ou incompleto.",
        )

    return detected
