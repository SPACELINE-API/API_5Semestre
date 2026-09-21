import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.service_orders.models.invite import (
    INVITE_STATUS_ACEITO,
    INVITE_STATUS_EXPIRADO,
    INVITE_STATUS_PENDENTE,
    INVITE_STATUS_RECUSADO,
    ServiceOrderItemInvite,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_EM_ANDAMENTO,
    ServiceOrderItem,
)
from app.modules.translators.models.translator import Translator
from app.shared.email.smtp_client import send_email
from app.shared.EnvProvider import env_provider


class InviteService:
    def __init__(self, db: Session):
        self.db = db

    def _get_item_or_404(self, item_id: uuid.UUID) -> ServiceOrderItem:
        item = self.db.query(ServiceOrderItem).filter(ServiceOrderItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item da ordem de serviço não encontrado")
        return item

    def _get_invite_or_404(self, invite_id: uuid.UUID) -> ServiceOrderItemInvite:
        invite = (
            self.db.query(ServiceOrderItemInvite)
            .filter(ServiceOrderItemInvite.id == invite_id)
            .first()
        )
        if not invite:
            raise HTTPException(status_code=404, detail="Convite não encontrado")
        return invite

    def send_invites(
        self, item_id: uuid.UUID, translator_ids: list[uuid.UUID]
    ) -> list[ServiceOrderItemInvite]:
        item = self._get_item_or_404(item_id)

        translators = self.db.query(Translator).filter(Translator.id.in_(translator_ids)).all()
        if len(translators) != len(set(translator_ids)):
            raise HTTPException(status_code=422, detail="Um ou mais tradutores não encontrados")

        invites = [
            ServiceOrderItemInvite(service_order_item_id=item.id, translator_id=translator.id)
            for translator in translators
        ]
        self.db.add_all(invites)
        self.db.commit()

        for invite, translator in zip(invites, translators, strict=True):
            self.db.refresh(invite)
            send_email(
                to=translator.email,
                subject="Novo serviço de tradução disponível",
                html_body=(
                    f"<p>Olá {translator.name}, você foi convidado para um novo serviço de "
                    f"tradução ({item.source_language} → {item.target_language}).</p>"
                    f'<p><a href="{env_provider.get_site_url()}/convites/{invite.id}">'
                    "Ver documento e responder</a></p>"
                ),
            )

        return invites

    def list_invites_for_item(self, item_id: uuid.UUID) -> list[ServiceOrderItemInvite]:
        self._get_item_or_404(item_id)
        return (
            self.db.query(ServiceOrderItemInvite)
            .filter(ServiceOrderItemInvite.service_order_item_id == item_id)
            .all()
        )

    def list_invites_for_translator_email(
        self, translator_email: str
    ) -> list[ServiceOrderItemInvite]:
        return (
            self.db.query(ServiceOrderItemInvite)
            .join(Translator, ServiceOrderItemInvite.translator_id == Translator.id)
            .filter(Translator.email.ilike(translator_email))
            .all()
        )

    def accept_invite(
        self, invite_id: uuid.UUID, current_user_email: str
    ) -> ServiceOrderItemInvite:
        invite = self._get_invite_or_404(invite_id)

        if invite.translator.email.lower() != current_user_email.lower():
            raise HTTPException(
                status_code=403,
                detail="Este convite não pertence ao usuário autenticado",
            )

        if invite.status != INVITE_STATUS_PENDENTE:
            raise HTTPException(status_code=409, detail="Este convite já foi respondido")

        item = invite.service_order_item
        if item.translator_id is not None:
            raise HTTPException(
                status_code=409,
                detail="Este item já possui um tradutor atribuído",
            )

        responded_at = datetime.now(UTC)
        invite.status = INVITE_STATUS_ACEITO
        invite.responded_at = responded_at

        item.translator_id = invite.translator_id
        item.status = STATUS_EM_ANDAMENTO

        for other_invite in item.invites:
            if other_invite.id != invite.id and other_invite.status == INVITE_STATUS_PENDENTE:
                other_invite.status = INVITE_STATUS_EXPIRADO
                other_invite.responded_at = responded_at

        self.db.commit()
        self.db.refresh(invite)

        return invite

    def decline_invite(
        self, invite_id: uuid.UUID, current_user_email: str
    ) -> ServiceOrderItemInvite:
        invite = self._get_invite_or_404(invite_id)

        if invite.translator.email.lower() != current_user_email.lower():
            raise HTTPException(
                status_code=403,
                detail="Este convite não pertence ao usuário autenticado",
            )

        if invite.status != INVITE_STATUS_PENDENTE:
            raise HTTPException(status_code=409, detail="Este convite já foi respondido")

        invite.status = INVITE_STATUS_RECUSADO
        invite.responded_at = datetime.now(UTC)

        self.db.commit()
        self.db.refresh(invite)

        return invite
