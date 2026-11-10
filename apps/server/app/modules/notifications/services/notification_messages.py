from dataclasses import dataclass

from app.modules.service_orders.models.service_order_file import (
    REVIEW_APPROVED,
    REVIEW_CHANGES_REQUESTED,
)
from app.modules.translators.models.translator_certificate import CertificateStatus


@dataclass(frozen=True)
class NotificationMessage:
    event_type: str
    title: str
    message: str


def certificate_received_message(translator_name: str) -> NotificationMessage:
    return NotificationMessage(
        event_type="certificate_received",
        title="Novo certificado recebido",
        message=f"O tradutor {translator_name} enviou um certificado para análise.",
    )


def certificate_review_message(status: CertificateStatus) -> NotificationMessage:
    is_approved = status == CertificateStatus.APPROVED
    return NotificationMessage(
        event_type="certificate_approved" if is_approved else "certificate_rejected",
        title="Resultado do certificado",
        message=f"Seu certificado foi {'aprovado' if is_approved else 'reprovado'}.",
    )


def document_received_message(translator_name: str) -> NotificationMessage:
    return NotificationMessage(
        event_type="document_received",
        title="Novo documento recebido",
        message=f"O tradutor {translator_name} enviou um documento para análise.",
    )


def document_review_message(review_status: str) -> NotificationMessage:
    if review_status == REVIEW_APPROVED:
        return NotificationMessage(
            event_type="document_approved",
            title="Documento aprovado",
            message="Seu documento foi aprovado.",
        )
    if review_status == REVIEW_CHANGES_REQUESTED:
        return NotificationMessage(
            event_type="document_changes_requested",
            title="Ajustes solicitados no documento",
            message="Foram solicitados ajustes no documento entregue.",
        )
    raise ValueError(f"Unsupported document review status: {review_status}")
