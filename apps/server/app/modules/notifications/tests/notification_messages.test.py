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
            lambda status: certificate_review_message(status, "Inglês"),
            CertificateStatus.APPROVED,
            NotificationMessage(
                event_type="certificate_approved",
                title="Resultado do certificado",
                message="Seu certificado de Inglês foi aprovado.",
            ),
        ),
        (
            lambda status: certificate_review_message(status, "Inglês"),
            CertificateStatus.REJECTED,
            NotificationMessage(
                event_type="certificate_rejected",
                title="Resultado do certificado",
                message="Seu certificado de Inglês foi reprovado.",
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


def test_describe_changes_lists_added_removed_and_updated_documents():
    from app.modules.notifications.services.notification_messages import describe_changes

    text = describe_changes(
        [
            {
                "action": "updated",
                "item": "Contrato (pt-BR → en-US)",
                "fields": {
                    "word_count": {"before": 1200, "after": 1500},
                    "deadline": {"before": "2026-12-10", "after": "2026-12-20"},
                    "price": {"before": "100.00", "after": "150.00"},
                },
            },
            {"action": "added", "item": "Certidão (pt-BR → es-ES)", "fields": {}},
            {"action": "removed", "item": "Procuração (pt-BR → fr-FR)", "fields": {}},
        ]
    )

    assert "palavras 1200 → 1500" in text
    assert "prazo 10/12/2026 → 20/12/2026" in text
    assert "valor R$ 100,00 → R$ 150,00" in text
    assert "Certidão (pt-BR → es-ES): adicionado" in text
    assert "Procuração (pt-BR → fr-FR): removido" in text


def test_describe_changes_summarises_the_overflow():
    from app.modules.notifications.services.notification_messages import describe_changes

    changes = [
        {"action": "added", "item": f"Documento {index}", "fields": {}} for index in range(6)
    ]

    text = describe_changes(changes)

    assert text.count("adicionado") == 4
    assert text.endswith("(+2 alterações)")


def test_quote_reopened_message_includes_the_reason():
    from app.modules.notifications.services.notification_messages import quote_reopened_message

    message = quote_reopened_message("Acme", " Cliente pediu mais prazo ")

    assert message.event_type == "quote_reopened"
    assert message.message.endswith("Motivo: Cliente pediu mais prazo")


def test_quote_changes_message_names_the_project_and_the_changes():
    from app.modules.notifications.services.notification_messages import quote_changes_message

    message = quote_changes_message(
        "Acme",
        "Projeto Alfa",
        [{"action": "added", "item": "Contrato (pt-BR → en-US)", "fields": {}}],
    )

    assert message.event_type == "quote_updated"
    assert 'ordem de serviço "Projeto Alfa" foi atualizada' in message.message
    assert "Contrato (pt-BR → en-US): adicionado" in message.message
