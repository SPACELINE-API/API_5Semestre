import pytest

from app.modules.notifications.services.notification_messages import (
    NotificationMessage,
    certificate_received_message,
    certificate_review_message,
    document_received_message,
    document_review_message,
    quote_approved_message,
    service_order_completed_message,
)
from app.modules.service_orders.models.service_order_file import (
    REVIEW_APPROVED,
    REVIEW_CHANGES_REQUESTED,
)
from app.modules.translators.models.translator_certificate import CertificateStatus


@pytest.mark.parametrize(
    ("builder", "argument", "expected"),
    [
        (
            certificate_received_message,
            "Ana",
            NotificationMessage(
                event_type="certificate_received",
                title="Novo certificado recebido",
                message="O tradutor Ana enviou um certificado para análise.",
            ),
        ),
        (
            certificate_review_message,
            CertificateStatus.APPROVED,
            NotificationMessage(
                event_type="certificate_approved",
                title="Resultado do certificado",
                message="Seu certificado foi aprovado.",
            ),
        ),
        (
            certificate_review_message,
            CertificateStatus.REJECTED,
            NotificationMessage(
                event_type="certificate_rejected",
                title="Resultado do certificado",
                message="Seu certificado foi reprovado.",
            ),
        ),
        (
            document_received_message,
            "Ana",
            NotificationMessage(
                event_type="document_received",
                title="Novo documento recebido",
                message="O tradutor Ana enviou um documento para análise.",
            ),
        ),
        (
            document_review_message,
            REVIEW_APPROVED,
            NotificationMessage(
                event_type="document_approved",
                title="Documento aprovado",
                message="Seu documento foi aprovado.",
            ),
        ),
        (
            document_review_message,
            REVIEW_CHANGES_REQUESTED,
            NotificationMessage(
                event_type="document_changes_requested",
                title="Ajustes solicitados no documento",
                message="Foram solicitados ajustes no documento entregue.",
            ),
        ),
        (
            quote_approved_message,
            "Empresa Alpha",
            NotificationMessage(
                event_type="quote_approved",
                title="Orçamento aprovado",
                message="O orçamento da empresa Empresa Alpha foi aprovado.",
            ),
        ),
        (
            service_order_completed_message,
            "Projeto Beta",
            NotificationMessage(
                event_type="service_order_completed",
                title="Ordem de serviço concluída",
                message='A ordem de serviço "Projeto Beta" foi concluída com sucesso.',
            ),
        ),
    ],
)
def test_notification_message_builders_return_centralized_content(
    builder, argument, expected: NotificationMessage
) -> None:
    assert builder(argument) == expected


def test_document_review_message_rejects_unsupported_status() -> None:
    with pytest.raises(ValueError, match="Unsupported document review status"):
        document_review_message("pending")
