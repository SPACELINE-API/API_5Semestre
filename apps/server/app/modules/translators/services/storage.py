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
