import re
import unicodedata
import uuid
from urllib.parse import quote

from fastapi import HTTPException

from app.shared.supabase.client import (
    create_supabase_headers,
    create_supabase_http_client,
    get_supabase_config,
)

PHOTO_BUCKET = "translator-photos"
# BUCKET PRIVADO: O ACESSO AOS CERTIFICADOS SO ACONTECE POR URL ASSINADA
CERTIFICATE_BUCKET = "translator-certificates"
SIGNED_URL_EXPIRES_IN = 300


def build_object_path(translator_id: uuid.UUID, filename: str) -> str:
    normalized = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode()
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", normalized).strip("._") or "arquivo"
    return f"{translator_id}/{uuid.uuid4()}_{safe_name[-120:]}"


def upload_object(bucket: str, object_path: str, content: bytes, content_type: str) -> None:
    config = get_supabase_config()
    headers = create_supabase_headers(config.service_role_key)
    headers["Content-Type"] = content_type
    upload_url = f"{config.url}/storage/v1/object/{bucket}/{quote(object_path)}"

    with create_supabase_http_client() as client:
        response = client.post(upload_url, headers=headers, content=content)

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail="Não foi possível armazenar o arquivo. Tente novamente.",
        )


def delete_object(bucket: str, object_path: str) -> None:
    config = get_supabase_config()
    headers = create_supabase_headers(config.service_role_key)

    with create_supabase_http_client() as client:
        client.request(
            "DELETE",
            f"{config.url}/storage/v1/object/{bucket}",
            headers=headers,
            json={"prefixes": [object_path]},
        )


def get_public_url(bucket: str, object_path: str) -> str:
    config = get_supabase_config()
    return f"{config.url}/storage/v1/object/public/{bucket}/{quote(object_path)}"


def create_signed_url(
    bucket: str, object_path: str, expires_in: int = SIGNED_URL_EXPIRES_IN
) -> str:
    config = get_supabase_config()
    headers = create_supabase_headers(config.service_role_key)
    sign_url = f"{config.url}/storage/v1/object/sign/{bucket}/{quote(object_path)}"

    with create_supabase_http_client() as client:
        response = client.post(sign_url, headers=headers, json={"expiresIn": expires_in})

    if response.status_code in (400, 404):
        raise HTTPException(status_code=404, detail="Arquivo indisponível no armazenamento.")
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível gerar o acesso ao arquivo. Tente novamente.",
        )

    signed_path = response.json().get("signedURL")
    if not signed_path:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível gerar o acesso ao arquivo. Tente novamente.",
        )
    return f"{config.url}/storage/v1{signed_path}"
