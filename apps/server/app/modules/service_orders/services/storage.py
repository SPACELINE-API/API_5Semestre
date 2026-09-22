import uuid
from typing import BinaryIO

from fastapi import HTTPException

from app.shared.supabase.client import (
    create_supabase_headers,
    create_supabase_http_client,
    get_supabase_config,
)


def upload_service_order_file(filename: str, file_data: BinaryIO, content_type: str) -> str:
    config = get_supabase_config()
    bucket = "service-order-files"

    unique_id = str(uuid.uuid4())
    file_path = f"{unique_id}_{filename}"

    upload_url = f"{config.url}/storage/v1/object/{bucket}/{file_path}"

    headers = create_supabase_headers(config.service_role_key)
    headers["Content-Type"] = content_type

    with create_supabase_http_client() as client:
        response = client.post(upload_url, headers=headers, content=file_data.read())

        if response.status_code not in (200, 201):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file to Supabase: {response.text}",
            )

    public_url = f"{config.url}/storage/v1/object/public/{bucket}/{file_path}"
    return public_url
