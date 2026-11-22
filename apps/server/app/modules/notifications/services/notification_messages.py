from dataclasses import dataclass
from typing import Any

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


def certificate_review_message(
    status: CertificateStatus, language_name: str
) -> NotificationMessage:
    is_approved = status == CertificateStatus.APPROVED
    return NotificationMessage(
        event_type="certificate_approved" if is_approved else "certificate_rejected",
        title="Resultado do certificado",
        message=f"Seu certificado de {language_name} foi {'aprovado' if is_approved else 'reprovado'}.",
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


def quote_approved_message(company_name: str | None) -> NotificationMessage:
    display_name = (company_name or "não identificada").strip()
    return NotificationMessage(
        event_type="quote_approved",
        title="Orçamento aprovado",
        message=f"O orçamento da empresa {display_name} foi aprovado.",
    )


CHANGE_FIELD_LABELS = {
    "source_language": "idioma de origem",
    "target_language": "idioma de destino",
    "document_type": "tipo de documento",
    "file_url": "arquivo",
    "word_count": "palavras",
    "price": "valor",
    "deadline": "prazo",
}
MAX_DESCRIBED_CHANGES = 4


def _format_change_value(field: str, value: Any) -> str:
    if value is None or value == "":
        return "—"
    if field == "price":
        return f"R$ {float(value):.2f}".replace(".", ",")
    if field == "deadline":
        year, month, day = str(value)[:10].split("-")
        return f"{day}/{month}/{year}"
    if field == "file_url":
        return str(value).rstrip("/").split("/")[-1]
    return str(value)


def describe_changes(changes: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for change in changes:
        action = change.get("action")
        item = change.get("item", "Documento")
        if action == "added":
            lines.append(f"{item}: adicionado")
        elif action == "removed":
            lines.append(f"{item}: removido")
        else:
            parts = [
                f"{CHANGE_FIELD_LABELS.get(field, field)} "
                f"{_format_change_value(field, values.get('before'))} → "
                f"{_format_change_value(field, values.get('after'))}"
                for field, values in (change.get("fields") or {}).items()
            ]
            if parts:
                lines.append(f"{item}: {'; '.join(parts)}")
    text = " | ".join(lines[:MAX_DESCRIBED_CHANGES])
    extra = len(lines) - MAX_DESCRIBED_CHANGES
    if extra > 0:
        text += f" (+{extra} {'alteração' if extra == 1 else 'alterações'})"
    return text


def quote_reopened_message(company_name: str | None, reason: str | None) -> NotificationMessage:
    display_name = (company_name or "não identificada").strip()
    message = f"O orçamento da empresa {display_name} foi reaberto para alteração."
    if reason and reason.strip():
        message += f" Motivo: {reason.strip()}"
    return NotificationMessage(
        event_type="quote_reopened",
        title="Orçamento reaberto",
        message=message,
    )


def quote_changes_message(
    company_name: str | None,
    project_name: str,
    changes: list[dict[str, Any]],
) -> NotificationMessage:
    display_name = (company_name or "não identificada").strip()
    message = (
        f"O orçamento da empresa {display_name} foi alterado e a ordem de serviço "
        f'"{project_name}" foi atualizada.'
    )
    description = describe_changes(changes)
    if description:
        message += f" {description}"
    return NotificationMessage(
        event_type="quote_updated",
        title="Orçamento atualizado",
        message=message,
    )


def service_order_completed_message(project_name: str) -> NotificationMessage:
    return NotificationMessage(
        event_type="service_order_completed",
        title="Ordem de serviço concluída",
        message=f'A ordem de serviço "{project_name}" foi concluída com sucesso.',
    )


def translator_invite_received_message(document_type: str | None) -> NotificationMessage:
    return NotificationMessage(
        event_type="translator_invite_received",
        title="Novo convite recebido",
        message=(
            f"Você recebeu um convite para traduzir {document_type}."
            if document_type
            else "Você recebeu um novo convite para um serviço de tradução."
        ),
    )
