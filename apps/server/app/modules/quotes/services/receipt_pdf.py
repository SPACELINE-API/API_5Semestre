import io
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.services.receipt_formatting import (
    format_brl,
    format_cnpj,
    format_datetime_br,
    format_phone,
    short_quote_code,
)


@dataclass(frozen=True)
class Issuer:
    legal_name: str
    trade_name: str
    cnpj: str
    address: str
    city: str
    phone: str
    website: str


ALIANCA_TRADUCOES = Issuer(
    legal_name="Aliança Traduções e Comunicações Ltda - EPP",
    trade_name="Aliança Traduções",
    cnpj="04.205.581/0001-59",
    address="Rua Pereira Estefano, 114 - Vila da Saúde",
    city="São Paulo/SP - CEP 04144-070",
    phone="(11) 3384-8550",
    website="aliancatraducoes.com",
)


BRAND_RED = colors.HexColor("#d71920")
TEXT_DARK = colors.HexColor("#1a1a1a")
TEXT = colors.HexColor("#333333")
TEXT_MUTED = colors.HexColor("#777777")
HEADER_BG = colors.HexColor("#f0f0f0")
CONTENT_WIDTH = A4[0] - 4 * cm


class ReceiptPDFGenerator:
    def __init__(self, logo_path: str | None = None):
        self.logo_path = logo_path

    def generate_receipt(
        self,
        quote: Quote,
        language_names: dict[str, str] | None = None,
    ) -> bytes:
        self.language_names = language_names or {}
        self._build_styles()
        quote_code = short_quote_code(quote.id)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=1.5 * cm,
            bottomMargin=2 * cm,
            title=f"Comprovante Comercial #{quote_code}",
            author=ALIANCA_TRADUCOES.trade_name,
        )

        elements = []
        elements += self._header(quote, quote_code)
        elements += self._client_section(quote)
        elements += self._contact_section(quote)
        elements += self._quote_section(quote, quote_code)
        elements += self._items_section(quote)
        elements += self._services_section(quote)
        elements += self._summary_section(quote)
        elements += self._notes_section(quote)
        elements += self._closing(quote, quote_code)

        def draw_footer(canvas, document):
            canvas.saveState()
            canvas.setStrokeColor(BRAND_RED)
            canvas.setLineWidth(0.8)
            canvas.line(2 * cm, 1.4 * cm, A4[0] - 2 * cm, 1.4 * cm)
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(TEXT_MUTED)
            canvas.drawString(
                2 * cm,
                1 * cm,
                f"{ALIANCA_TRADUCOES.trade_name} · CNPJ {ALIANCA_TRADUCOES.cnpj} · "
                f"{ALIANCA_TRADUCOES.phone} · Comprovante #{quote_code}",
            )
            canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Página {document.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_footer, onLaterPages=draw_footer)
        buffer.seek(0)
        return buffer.read()

    def _build_styles(self) -> None:
        styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            "ReceiptTitle",
            parent=styles["Heading1"],
            fontSize=14,
            leading=17,
            textColor=TEXT_DARK,
            alignment=TA_RIGHT,
            spaceAfter=4,
        )
        self.subtitle_style = ParagraphStyle(
            "ReceiptSubtitle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=TEXT_MUTED,
            alignment=TA_RIGHT,
        )
        self.header_style = ParagraphStyle(
            "ReceiptSection",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=TEXT_DARK,
            spaceBefore=4,
            spaceAfter=6,
        )
        self.normal_style = ParagraphStyle(
            "ReceiptNormal",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=TEXT,
        )
        self.right_style = ParagraphStyle(
            "ReceiptRight", parent=self.normal_style, alignment=TA_RIGHT
        )
        self.bold_style = ParagraphStyle(
            "ReceiptBold", parent=self.normal_style, fontName="Helvetica-Bold"
        )
        self.bold_right_style = ParagraphStyle(
            "ReceiptBoldRight", parent=self.bold_style, alignment=TA_RIGHT
        )
        self.issuer_style = ParagraphStyle(
            "ReceiptIssuer",
            parent=self.normal_style,
            fontSize=8,
            leading=11,
            textColor=TEXT_MUTED,
            alignment=TA_LEFT,
        )
        self.muted_style = ParagraphStyle(
            "ReceiptMuted", parent=self.normal_style, fontSize=8, textColor=TEXT_MUTED
        )

    def _section_title(self, title: str) -> Paragraph:
        return Paragraph(title, self.header_style)

    def _key_values(self, rows: list[tuple[str, str | None]]) -> Table:
        data = [
            [Paragraph(label, self.bold_style), Paragraph(value or "-", self.normal_style)]
            for label, value in rows
        ]
        table = Table(data, colWidths=[4.5 * cm, CONTENT_WIDTH - 4.5 * cm], hAlign=TA_LEFT)
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return table

    def _grid(self, data: list[list], col_widths: list[float]) -> Table:
        table = Table(data, colWidths=col_widths, hAlign=TA_LEFT, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        return table

    def _language(self, code: str | None) -> str:
        if not code:
            return "-"
        return self.language_names.get(code, code)

    def _header(self, quote: Quote, quote_code: str) -> list:
        issuer = ALIANCA_TRADUCOES
        logo = ""
        if self.logo_path and Path(self.logo_path).exists():
            try:
                logo = Image(self.logo_path, width=1.8 * cm, height=1.8 * cm)
            except Exception:
                logo = ""

        issuer_block = Paragraph(
            f"<font size=11 color='#1a1a1a'><b>{issuer.trade_name}</b></font><br/>"
            f"{issuer.legal_name}<br/>"
            f"CNPJ {issuer.cnpj}<br/>"
            f"{issuer.address}<br/>"
            f"{issuer.city}<br/>"
            f"Telefone {issuer.phone} · {issuer.website}",
            self.issuer_style,
        )
        title_block = [
            Paragraph("COMPROVANTE COMERCIAL", self.title_style),
            Paragraph(f"Orçamento <b>#{quote_code}</b>", self.subtitle_style),
            Paragraph(f"Aprovado em {format_datetime_br(quote.approved_at)}", self.subtitle_style),
        ]
        header = Table(
            [[logo, issuer_block, title_block]],
            colWidths=[2.2 * cm, CONTENT_WIDTH - 8.2 * cm, 6 * cm],
            hAlign=TA_LEFT,
        )
        header.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, BRAND_RED),
                ]
            )
        )
        return [header, Spacer(1, 0.4 * cm)]

    def _client_section(self, quote: Quote) -> list:
        company = quote.company
        if company is None:
            if not (quote.enterprise or quote.customer_name):
                return []
            rows = [
                ("Empresa:", quote.enterprise),
                ("Solicitante:", quote.customer_name),
                ("E-mail:", quote.email),
            ]
            return [
                self._section_title("Dados do Cliente"),
                self._key_values(rows),
                Spacer(1, 0.3 * cm),
            ]

        address = f"{company.street}, {company.number}"
        if company.complement:
            address += f" - {company.complement}"
        address += (
            f"<br/>{company.neighborhood} - {company.city}/{company.state}"
            f"<br/>CEP {company.zip_code}"
        )
        rows = [
            ("Razão social:", company.legal_name),
            ("Nome fantasia:", company.trade_name),
            ("CNPJ:", format_cnpj(company.cnpj)),
            ("E-mail:", company.email),
            ("Telefone:", format_phone(company.phone)),
            ("Endereço:", address),
        ]
        return [
            self._section_title("Dados do Cliente"),
            self._key_values(rows),
            Spacer(1, 0.3 * cm),
        ]

    def _contact_section(self, quote: Quote) -> list:
        contact = quote.contact
        if contact is not None:
            rows = [
                ("Nome:", contact.name),
                ("Departamento:", contact.department),
                ("E-mail:", contact.email),
                ("Telefone:", format_phone(contact.phone)),
            ]
        elif quote.company is not None and quote.customer_name:
            rows = [("Nome:", quote.customer_name), ("E-mail:", quote.email)]
        else:
            return []
        return [
            self._section_title("Contato Responsável"),
            self._key_values(rows),
            Spacer(1, 0.3 * cm),
        ]

    def _quote_section(self, quote: Quote, quote_code: str) -> list:
        service_order = quote.service_orders[0] if quote.service_orders else None
        rows = [
            ("Código do orçamento:", f"#{quote_code}"),
            (
                "Projeto:",
                (service_order.project_name if service_order else None) or quote.customer_need,
            ),
            ("Data da solicitação:", format_datetime_br(quote.created_at)),
            ("Data de aprovação:", format_datetime_br(quote.approved_at)),
            ("Aprovado por:", quote.approved_by_email),
            ("Situação:", "Aprovado"),
        ]
        if service_order is not None:
            rows.append(("Ordem de serviço:", f"#{short_quote_code(service_order.id)}"))
            if service_order.deadline:
                rows.append(("Prazo de entrega:", format_datetime_br(service_order.deadline)))
            if service_order.domain_area:
                rows.append(("Área:", service_order.domain_area))
        return [
            self._section_title("Dados do Orçamento"),
            self._key_values(rows),
            Spacer(1, 0.3 * cm),
        ]

    def _items_section(self, quote: Quote) -> list:
        if not quote.items:
            return []

        data = [
            [
                Paragraph("#", self.bold_style),
                Paragraph("Documento", self.bold_style),
                Paragraph("Idioma de origem", self.bold_style),
                Paragraph("Idioma de destino", self.bold_style),
                Paragraph("Valor", self.bold_right_style),
            ]
        ]
        for index, item in enumerate(quote.items, start=1):
            data.append(
                [
                    Paragraph(str(index), self.normal_style),
                    Paragraph(item.document_type or "-", self.normal_style),
                    Paragraph(self._language(item.source_language), self.normal_style),
                    Paragraph(self._language(item.target_language), self.normal_style),
                    Paragraph(
                        f"R$ {format_brl(item.estimated_value)}"
                        if item.estimated_value is not None
                        else "-",
                        self.right_style,
                    ),
                ]
            )

        widths = [0.8 * cm, 5.2 * cm, 3.5 * cm, 3.5 * cm, CONTENT_WIDTH - 13 * cm]
        return [
            self._section_title(f"Itens de Tradução ({len(quote.items)})"),
            self._grid(data, widths),
            Spacer(1, 0.3 * cm),
        ]

    def _services_section(self, quote: Quote) -> list:
        if not quote.additional_services:
            return []

        data = [
            [
                Paragraph("#", self.bold_style),
                Paragraph("Descrição", self.bold_style),
                Paragraph("Valor", self.bold_right_style),
            ]
        ]
        for index, service in enumerate(quote.additional_services, start=1):
            data.append(
                [
                    Paragraph(str(index), self.normal_style),
                    Paragraph(service.description, self.normal_style),
                    Paragraph(f"R$ {format_brl(service.price)}", self.right_style),
                ]
            )

        widths = [0.8 * cm, CONTENT_WIDTH - 4.8 * cm, 4 * cm]
        return [
            self._section_title(f"Serviços Adicionais ({len(quote.additional_services)})"),
            self._grid(data, widths),
            Spacer(1, 0.3 * cm),
        ]

    def _summary_section(self, quote: Quote) -> list:
        items_total = sum(
            (item.estimated_value or Decimal("0.00") for item in quote.items), Decimal("0.00")
        )
        services_total = sum(
            (service.price for service in quote.additional_services), Decimal("0.00")
        )
        total = items_total + services_total

        data = [
            [
                Paragraph(f"Subtotal de traduções ({len(quote.items)})", self.normal_style),
                Paragraph(f"R$ {format_brl(items_total)}", self.right_style),
            ],
        ]
        if quote.additional_services:
            data.append(
                [
                    Paragraph(
                        f"Subtotal de serviços adicionais ({len(quote.additional_services)})",
                        self.normal_style,
                    ),
                    Paragraph(f"R$ {format_brl(services_total)}", self.right_style),
                ]
            )
        data += [
            [
                Paragraph("TOTAL APROVADO", self.bold_style),
                Paragraph(f"R$ {format_brl(total)}", self.bold_right_style),
            ],
        ]
        table = Table(data, colWidths=[CONTENT_WIDTH - 4 * cm, 4 * cm], hAlign=TA_LEFT)
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, TEXT_DARK),
                    ("BACKGROUND", (0, -1), (-1, -1), HEADER_BG),
                ]
            )
        )
        return [
            KeepTogether([self._section_title("Resumo Financeiro"), table]),
            Spacer(1, 0.3 * cm),
        ]

    def _notes_section(self, quote: Quote) -> list:
        service_order = quote.service_orders[0] if quote.service_orders else None
        notes = service_order.external_notes if service_order else None
        if not notes:
            return []
        return [
            self._section_title("Observações"),
            Paragraph(notes.replace("\n", "<br/>"), self.normal_style),
            Spacer(1, 0.3 * cm),
        ]

    def _closing(self, quote: Quote, quote_code: str) -> list:
        issued_at = format_datetime_br(datetime.now(UTC))
        approver = f", registrada por {quote.approved_by_email}" if quote.approved_by_email else ""
        closing = [
            Paragraph(
                f"Este documento comprova a aprovação comercial do orçamento #{quote_code} "
                f"em {format_datetime_br(quote.approved_at)}{approver}. Os valores acima correspondem "
                "ao orçamento aprovado.",
                self.normal_style,
            ),
            Spacer(1, 0.3 * cm),
            Paragraph(
                f"Emitido em {issued_at} · Referência completa: {quote.id}",
                self.muted_style,
            ),
        ]
        return [Spacer(1, 0.3 * cm), KeepTogether(closing)]
