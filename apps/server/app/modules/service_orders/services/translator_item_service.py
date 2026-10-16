import io
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_SAIDA,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    ServiceOrderItem,
)
from app.modules.service_orders.schemas.translator_item import (
    TranslatorItemFileResponse,
    TranslatorItemResponse,
)
from app.modules.service_orders.services.storage import (
    delete_service_order_file,
    upload_service_order_file,
)
from app.modules.translators.models.translator import Translator

DELIVERY_MAX_BYTES = 25 * 1024 * 1024
DELIVERY_EXTENSIONS = frozenset(
    {"pdf", "doc", "docx", "odt", "rtf", "txt", "xls", "xlsx", "png", "jpg", "jpeg"}
)


def validate_delivery_file(filename: str, content: bytes) -> None:
    if not content:
        raise HTTPException(status_code=422, detail="O arquivo da tradução está vazio.")

    if len(content) > DELIVERY_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"O arquivo da tradução excede o limite de {DELIVERY_MAX_BYTES // (1024 * 1024)} MB."
            ),
        )

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in DELIVERY_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail="Formato inválido. Envie PDF, Word, planilha, texto ou imagem.",
        )


class TranslatorItemService:
    def __init__(self, db: Session):
        self.db = db

    def _get_translator(self, email: str) -> Translator:
        translator = self.db.query(Translator).filter(Translator.email.ilike(email)).first()
        if translator is None:
            raise HTTPException(
                status_code=404,
                detail="Nenhum perfil de tradutor está associado a este usuário.",
            )
        return translator

    def _item_query(self):
        return self.db.query(ServiceOrderItem).options(
            joinedload(ServiceOrderItem.service_order).selectinload(ServiceOrder.files)
        )

    def _get_own_item(self, item_id: uuid.UUID, translator: Translator) -> ServiceOrderItem:
        item = self._item_query().filter(ServiceOrderItem.id == item_id).first()
        if item is None:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        if item.translator_id != translator.id:
            raise HTTPException(
                status_code=403,
                detail="Este item não está atribuído ao usuário autenticado",
            )

        return item

    def list_items(self, email: str) -> list[TranslatorItemResponse]:
        translator = self._get_translator(email)
        items = (
            self._item_query()
            .filter(ServiceOrderItem.translator_id == translator.id)
            .order_by(ServiceOrderItem.deadline.asc().nulls_last(), ServiceOrderItem.created_at)
            .all()
        )
        return [self.to_response(item) for item in items]

    def get_item(self, item_id: uuid.UUID, email: str) -> TranslatorItemResponse:
        translator = self._get_translator(email)
        return self.to_response(self._get_own_item(item_id, translator))

    def deliver(
        self,
        item_id: uuid.UUID,
        email: str,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> TranslatorItemResponse:
        translator = self._get_translator(email)
        item = self._get_own_item(item_id, translator)

        if item.status == STATUS_CONCLUIDA:
            raise HTTPException(status_code=409, detail="Este item já foi concluído.")

        validate_delivery_file(filename, content)

        file_url = upload_service_order_file(filename, io.BytesIO(content), content_type)

        self.db.add(
            ServiceOrderFile(
                service_order_id=item.service_order_id,
                service_order_item_id=item.id,
                filename=filename[:255],
                file_url=file_url,
                direction=DIRECTION_SAIDA,
            )
        )
        item.status = STATUS_EM_ANALISE
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            delete_service_order_file(file_url)
            raise

        self.db.refresh(item)
        return self.to_response(item)

    def to_response(self, item: ServiceOrderItem) -> TranslatorItemResponse:
        delivered = sorted(
            (
                file
                for file in item.service_order.files
                if file.service_order_item_id == item.id and file.direction == DIRECTION_SAIDA
            ),
            key=lambda file: file.uploaded_at,
            reverse=True,
        )

        return TranslatorItemResponse(
            id=item.id,
            source_language=item.source_language,
            target_language=item.target_language,
            document_type=item.document_type,
            file_url=item.file_url,
            word_count=item.word_count,
            price=item.price,
            deadline=item.deadline,
            status=item.status,
            delivered_files=[TranslatorItemFileResponse.model_validate(file) for file in delivered],
        )
