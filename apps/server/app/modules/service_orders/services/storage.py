import uuid
from typing import BinaryIO
from urllib.parse import quote, unquote, urlparse

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


def get_service_order_storage_path(file_url: str) -> str | None:
    parsed = urlparse(file_url)
    prefix = "/storage/v1/object/public/service-order-files/"
    if not parsed.path.startswith(prefix):
        return None

    object_path = unquote(parsed.path[len(prefix) :])
    if not object_path or ".." in object_path.split("/"):
        return None

    return object_path


def service_order_file_exists(storage_path: str) -> bool:
    if not storage_path or ".." in storage_path.split("/"):
        raise HTTPException(status_code=400, detail="Caminho do documento inválido")

    config = get_supabase_config()
    object_path = quote(storage_path, safe="/")
    url = f"{config.url}/storage/v1/object/service-order-files/{object_path}"
    headers = create_supabase_headers(config.service_role_key)

    try:
        with create_supabase_http_client() as client:
            response = client.head(url, headers=headers)
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível verificar o documento no armazenamento.",
        ) from error

    if response.status_code == 404:
        return False
    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail="Não foi possível verificar o documento no armazenamento.",
        )

    return True


def download_service_order_file(storage_path: str) -> bytes:
    if not storage_path or ".." in storage_path.split("/"):
        raise HTTPException(status_code=400, detail="Caminho do documento inválido")

    config = get_supabase_config()
    object_path = quote(storage_path, safe="/")
    url = f"{config.url}/storage/v1/object/service-order-files/{object_path}"
    headers = create_supabase_headers(config.service_role_key)
    try:
        with create_supabase_http_client() as client:
            response = client.get(url, headers=headers)
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível recuperar o documento do armazenamento.",
        ) from error

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Documento não encontrado no Storage.")
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível recuperar o documento do armazenamento.",
        )
    return response.content


def delete_service_order_file(file_url: str) -> None:
    config = get_supabase_config()
    parsed = urlparse(file_url)
    configured = urlparse(config.url)
    prefix = "/storage/v1/object/public/service-order-files/"
    if parsed.netloc != configured.netloc or not parsed.path.startswith(prefix):
        return

    object_path = unquote(parsed.path[len(prefix) :])
    if not object_path or ".." in object_path.split("/"):
        raise HTTPException(status_code=400, detail="URL de arquivo inválida")

    delete_url = f"{config.url}/storage/v1/object/service-order-files"
    headers = create_supabase_headers(config.service_role_key)
    with create_supabase_http_client() as client:
        response = client.request(
            "DELETE",
            delete_url,
            headers=headers,
            json={"prefixes": [object_path]},
        )
        if response.status_code not in (200, 204):
            raise HTTPException(
                status_code=502,
                detail="Não foi possível remover o documento do armazenamento. Tente novamente.",
            )
