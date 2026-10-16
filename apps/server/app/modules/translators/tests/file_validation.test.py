import pytest
from fastapi import HTTPException

from app.modules.translators.services.file_validation import (
    CERTIFICATE_RULES,
    PHOTO_RULES,
    validate_upload,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 32
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 32
PDF = b"%PDF-1.7\n" + b"0" * 32
GIF = b"GIF89a" + b"0" * 32


@pytest.mark.parametrize(
    ("content", "declared", "expected"),
    [
        (PNG, "image/png", "image/png"),
        (JPEG, "image/jpeg", "image/jpeg"),
        (WEBP, "image/webp", "image/webp"),
    ],
)
def test_photo_accepts_png_jpeg_and_webp(content, declared, expected):
    assert validate_upload(content, declared, PHOTO_RULES) == expected


@pytest.mark.parametrize("content", [PDF, GIF])
def test_photo_rejects_unsupported_formats(content):
    with pytest.raises(HTTPException) as error:
        validate_upload(content, None, PHOTO_RULES)

    assert error.value.status_code == 422


def test_rejects_content_that_does_not_match_declared_type():
    with pytest.raises(HTTPException) as error:
        validate_upload(PNG, "image/jpeg", PHOTO_RULES)

    assert error.value.status_code == 422


def test_rejects_empty_file():
    with pytest.raises(HTTPException) as error:
        validate_upload(b"", "image/png", PHOTO_RULES)

    assert error.value.status_code == 422


def test_rejects_file_above_size_limit():
    oversized = PNG + b"0" * PHOTO_RULES.max_bytes

    with pytest.raises(HTTPException) as error:
        validate_upload(oversized, "image/png", PHOTO_RULES)

    assert error.value.status_code == 413


CERTIFICATE_PDF = b"%PDF-1.7\n" + b"0" * 32 + b"\n%%EOF\n"
CERTIFICATE_PNG = PNG + b"IEND\xaeB`\x82"
CERTIFICATE_JPEG = JPEG + b"\xff\xd9"


@pytest.mark.parametrize(
    ("content", "declared", "expected"),
    [
        (CERTIFICATE_PDF, "application/pdf", "application/pdf"),
        (CERTIFICATE_PNG, "image/png", "image/png"),
        (CERTIFICATE_JPEG, "image/jpeg", "image/jpeg"),
    ],
)
def test_certificate_accepts_pdf_png_and_jpeg(content, declared, expected):
    assert validate_upload(content, declared, CERTIFICATE_RULES) == expected


@pytest.mark.parametrize("content", [WEBP, GIF])
def test_certificate_rejects_unsupported_formats(content):
    with pytest.raises(HTTPException) as error:
        validate_upload(content, None, CERTIFICATE_RULES)

    assert error.value.status_code == 422
    assert "PDF, JPG ou PNG" in error.value.detail


@pytest.mark.parametrize("content", [PDF, PNG, JPEG])
def test_certificate_rejects_truncated_file(content):
    with pytest.raises(HTTPException) as error:
        validate_upload(content, None, CERTIFICATE_RULES)

    assert error.value.status_code == 422
    assert "corrompido" in error.value.detail


def test_certificate_rejects_file_above_10_mb():
    oversized = b"%PDF-1.7\n" + b"0" * CERTIFICATE_RULES.max_bytes + b"%%EOF"

    with pytest.raises(HTTPException) as error:
        validate_upload(oversized, "application/pdf", CERTIFICATE_RULES)

    assert error.value.status_code == 413


def test_photo_does_not_require_end_marker():
    assert validate_upload(PNG, "image/png", PHOTO_RULES) == "image/png"
