import pytest
from fastapi import HTTPException

from app.modules.translators.services.file_validation import PHOTO_RULES, validate_upload

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
