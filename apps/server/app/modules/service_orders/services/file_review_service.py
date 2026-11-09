import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.notifications.services.notification_messages import document_review_message
from app.modules.notifications.services.notification_service import NotificationService
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_SAIDA,
    REVIEW_APPROVED,
    REVIEW_CHANGES_REQUESTED,
    REVIEW_PENDING,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_EM_ANDAMENTO,
    ServiceOrderItem,
)


class ServiceOrderFileReviewService:
    def __init__(self, db: Session):
        self.db = db

    def _get_reviewable_file(
        self, service_order_id: uuid.UUID, file_id: uuid.UUID
    ) -> tuple[ServiceOrderFile, ServiceOrderItem]:
        file = (
            self.db.query(ServiceOrderFile)
            .filter(
                ServiceOrderFile.id == file_id,
                ServiceOrderFile.service_order_id == service_order_id,
            )
            .first()
        )
        if file is None:
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        if file.direction != DIRECTION_SAIDA or file.service_order_item_id is None:
            raise HTTPException(
                status_code=409,
                detail="Somente entregas de tradutores podem ser revisadas.",
            )

        if file.review_status != REVIEW_PENDING:
            raise HTTPException(status_code=409, detail="Esta entrega já foi revisada.")

        item = self.db.get(ServiceOrderItem, file.service_order_item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Item da ordem de serviço não encontrado")

        return file, item

    def approve(self, service_order_id: uuid.UUID, file_id: uuid.UUID) -> ServiceOrderFile:
        file, item = self._get_reviewable_file(service_order_id, file_id)

        file.review_status = REVIEW_APPROVED
        file.review_note = None
        file.reviewed_at = datetime.now(UTC)

        if item.translator is not None:
            notification_message = document_review_message(file.review_status)
            NotificationService(self.db).notify_translator(
                item.translator,
                event_type=notification_message.event_type,
                title=notification_message.title,
                message=notification_message.message,
                related_type="service_order_file",
                related_id=file.id,
                idempotency_key=f"document:{file.id}:review:approved:{file.reviewed_at.isoformat()}",
            )

        self.db.commit()
        self.db.refresh(file)
        return file

    def request_changes(
        self, service_order_id: uuid.UUID, file_id: uuid.UUID, note: str
    ) -> ServiceOrderFile:
        file, item = self._get_reviewable_file(service_order_id, file_id)

        file.review_status = REVIEW_CHANGES_REQUESTED
        file.review_note = note.strip()
        file.reviewed_at = datetime.now(UTC)
        item.status = STATUS_EM_ANDAMENTO
        item.completed_at = None

        if item.translator is not None:
            notification_message = document_review_message(file.review_status)
            NotificationService(self.db).notify_translator(
                item.translator,
                event_type=notification_message.event_type,
                title=notification_message.title,
                message=notification_message.message,
                related_type="service_order_file",
                related_id=file.id,
                idempotency_key=(
                    f"document:{file.id}:review:changes_requested:{file.reviewed_at.isoformat()}"
                ),
            )

        self.db.commit()
        self.db.refresh(file)
        return file
