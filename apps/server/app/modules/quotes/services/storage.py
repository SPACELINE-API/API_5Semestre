import uuid
from typing import BinaryIO

from fastapi import HTTPException

from app.shared.supabase.client import (
    create_supabase_headers,
    create_supabase_http_client,
    get_supabase_config,
)


def upload_quote_document(
    filename: str,
    file_data: BinaryIO,
    content_type: str,
    *,
    storage_path: str | None = None,
) -> str:
    config = get_supabase_config()
    bucket = "quotes-documents"

    if storage_path is None:
        file_path = f"{uuid.uuid4()}_{filename}"
    else:
        file_path = storage_path

    upload_url = f"{config.url}/storage/v1/object/{bucket}/{file_path}"

    headers = create_supabase_headers(config.service_role_key)
    headers["Content-Type"] = content_type
    if storage_path is not None:
        headers["x-upsert"] = "true"

    with create_supabase_http_client() as client:
        response = client.post(upload_url, headers=headers, content=file_data.read())

        if response.status_code not in (200, 201):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file to Supabase: {response.text}",
            )

    public_url = f"{config.url}/storage/v1/object/public/{bucket}/{file_path}"
    return public_url
