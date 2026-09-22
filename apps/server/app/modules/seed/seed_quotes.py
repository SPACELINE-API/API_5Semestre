import io
import random
import re
import unicodedata
import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.service_orders.services.storage import upload_service_order_file
from app.shared.database import get_session_factory

_SAMPLE_EXCERPTS = [
    "As partes acima identificadas resolvem celebrar o presente instrumento, "
    "mediante as clausulas e condicoes a seguir descritas.",
    "O presente documento tem por objetivo formalizar os termos acordados "
    "entre as partes, respeitando a legislacao vigente.",
    "Fica estabelecido que as obrigacoes aqui previstas devem ser cumpridas "
    "integralmente, sob pena das sancoes cabiveis.",
    "As informacoes contidas neste documento sao confidenciais e destinam-se "
    "exclusivamente as partes envolvidas na negociacao.",
]


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def _pdf_escape(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return normalized.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _wrap_text(text: str, width: int = 80) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""

    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > width:
            lines.append(current)
            current = word
        else:
            current = candidate

    if current:
        lines.append(current)

    return lines


def _build_pdf(title: str, body_lines: list[str]) -> bytes:
    content_lines = [f"BT /F1 16 Tf 50 740 Td ({_pdf_escape(title)}) Tj ET"]
    y = 700
    for line in body_lines:
        content_lines.append(f"BT /F1 11 Tf 50 {y} Td ({_pdf_escape(line)}) Tj ET")
        y -= 20

    content = "\n".join(content_lines).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    buffer = bytearray(b"%PDF-1.4\n")
    offsets = []

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(buffer))
        buffer += f"{index} 0 obj\n".encode("latin-1")
        buffer += obj
        buffer += b"\nendobj\n"

    xref_offset = len(buffer)
    buffer += f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
    buffer += b"0000000000 65535 f \n"
    for offset in offsets:
        buffer += f"{offset:010d} 00000 n \n".encode("latin-1")

    buffer += b"trailer\n"
    buffer += f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("latin-1")
    buffer += b"startxref\n"
    buffer += f"{xref_offset}\n".encode("latin-1")
    buffer += b"%%EOF"

    return bytes(buffer)


def _build_sample_file(document_type: str) -> tuple[str, bytes, str]:
    excerpt = random.choice(_SAMPLE_EXCERPTS)
    body_lines = _wrap_text(excerpt) + [
        "",
        "Documento gerado automaticamente para fins de demonstracao (seed).",
    ]
    file_bytes = _build_pdf(document_type, body_lines)
    filename = f"{_slugify(document_type)}.pdf"
    return filename, file_bytes, "application/pdf"


@dataclass(frozen=True)
class SeedQuote:
    id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str
    estimated_value: Decimal


SEED_QUOTES = [
    SeedQuote(
        id=uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        source_language="pt-BR",
        target_language="en-US",
        document_type="Contrato societário",
        estimated_value=Decimal("1240.00"),
    ),
    SeedQuote(
        id=uuid.UUID("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
        source_language="es-ES",
        target_language="pt-BR",
        document_type="Certidão de nascimento",
        estimated_value=Decimal("380.00"),
    ),
    SeedQuote(
        id=uuid.UUID("e4eaaaf2-d142-11e1-b3e4-080027620cdd"),
        source_language="en-US",
        target_language="pt-BR",
        document_type="Termo de confidencialidade",
        estimated_value=Decimal("610.00"),
    ),
]


def seed_quotes(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        database_session.query(Quote).delete()
        seeded_ids = []

        for seed_quote in SEED_QUOTES:
            filename, file_bytes, content_type = _build_sample_file(seed_quote.document_type)
            file_url = upload_service_order_file(filename, io.BytesIO(file_bytes), content_type)

            quote = Quote(id=seed_quote.id, status="approved")
            quote.items.append(
                QuoteTranslationItem(
                    source_language=seed_quote.source_language,
                    target_language=seed_quote.target_language,
                    document_type=seed_quote.document_type,
                    estimated_value=seed_quote.estimated_value,
                    file_url=file_url,
                )
            )
            database_session.add(quote)
            seeded_ids.append(str(seed_quote.id))

        database_session.commit()

        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
