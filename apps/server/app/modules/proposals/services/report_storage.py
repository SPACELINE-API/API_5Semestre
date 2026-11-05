import uuid

from app.modules.translators.services.storage import create_signed_url, upload_object

REPORT_BUCKET = "proposal-reports"
REPORT_URL_EXPIRES_IN = 300


def upload_report(content: bytes, filename: str, content_type: str) -> str:
    object_path = f"{uuid.uuid4()}/{filename}"
    upload_object(REPORT_BUCKET, object_path, content, content_type)
    return create_signed_url(REPORT_BUCKET, object_path, REPORT_URL_EXPIRES_IN)
