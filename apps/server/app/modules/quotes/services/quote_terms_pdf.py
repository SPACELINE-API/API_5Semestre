import io
from datetime import datetime
from html import escape
from pathlib import Path

from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.services.receipt_formatting import (
    SAO_PAULO_TIMEZONE,
    format_brl,
    short_quote_code,
)
from app.modules.quotes.services.receipt_pdf import (
    ALIANCA_TRADUCOES,
    BRAND_RED,
    CONTENT_WIDTH,
    TEXT,
    TEXT_DARK,
    TEXT_MUTED,
)

LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "receipt-logo-alianca.png"

IMPORTANT_INFORMATION = (
    "O valor apresentado não inclui os custos de reconhecimento de firma, apostilamento e "
    "demais serviços cartorários. Para saber se esses serviços são necessários para o seu caso, "
    "sugerimos que consulte o órgão ao qual o documento será apresentado. Assim, poderemos "
    "incluir os respectivos custos no orçamento.",
    "O montante total corresponde à aprovação de todos os documentos incluídos no pacote. Caso "
    "os documentos sejam aprovados individualmente, o valor mínimo será de R$ 100,00.",
    "Ressaltamos que o prazo ofertado não considera o dia da aprovação, iniciando-se a contagem "
    "a partir do primeiro dia útil subsequente.",
    "A apresentação do documento original não é obrigatória para o início da tradução.",
    "O documento original normalmente é assinado, notarizado ou apostilado no país de origem. "
    "Assim, para a entrega final da tradução juramentada, é necessário que o cliente informe se "
    "o documento original será apresentado e, em caso positivo, em qual formato (digital, "
    "físico, cópia etc.).",
    "Caso a forma de finalização não seja definida ou o documento original não seja entregue em "
    "até 30 dias após o prazo de entrega combinado, será realizado o faturamento imediato, com "
    "emissão de nota fiscal referente à tradução simples já realizada. Nessa situação, será "
    "aplicado um desconto de 10% sobre o valor originalmente orçado e aprovado.",
)

PAYMENT_INFORMATION = (
    "Transferência: Banco Itaú | Agência: 0067 | C/C: 26234-5",
    "Cartão de crédito: via link ou na máquina de forma presencial (consulte as condições de "
    "parcelamento).",
    "PIX: CNPJ 04.205.581/0001-59 | ALIANCA TRADUCOES E COMUNICACOES LTDA",
    "A aprovação se dará a partir da confirmação do pagamento.",
    "A emissão da nota fiscal é obrigatória e deve ser feita com os dados da pessoa que realizou "
    "o pagamento, como nome completo ou razão social, CPF ou CNPJ e endereço.",
    "Todos os pagamentos vencem 10 dias após o recebimento da fatura.",
    "Pagamentos internacionais serão realizados mediante Invoice Comercial. Caso essa seja a "
    "opção desejada, solicitamos que nos informe antes da aprovação do orçamento para inclusão "
    "das taxas de câmbio.",
)

ADDITIONAL_SERVICES = (
    "Serviços de interpretação, transcrição e legendagem, revisão, diagramação e formatação.",
    "Serviço de entrega rápida de documentos.",
    "Serviço de reconhecimento de firma, apostilamento e CDT.",
)


def proposal_conditions(valid_until: str) -> tuple[str, ...]:
    return (
        "O valor inclui os impostos.",
        f"O prazo indicado, as condições apresentadas e a proposta terão validade até "
        f"{valid_until}.",
        "Após a aprovação do prazo, não será possível antecipar a entrega do trabalho. Em casos "
        "excepcionais de antecipação da entrega, será cobrada uma taxa de urgência a ser "
        "negociada entre as partes.",
        "A tradução de imagens não editáveis será feita como legenda, a não ser que o cliente "
        "opte pelo serviço de diagramação, que será cobrado separadamente.",
        "Solicitamos a indicação de fontes de pesquisa, bibliografia ou glossários, quando "
        "houver. Caso não ocorra tal indicação, a Contratada fará uso dos meios de pesquisa "
        "disponíveis, tais como glossários, dicionários, livros, sites etc., ficando ao seu "
        "critério a utilização dos termos que achar mais adequados.",
        "Em caso de cancelamento após a aprovação dos serviços de tradução ou versão, serão "
        "cobradas as laudas já traduzidas.",
        "Em caso de cancelamento após a aprovação de outros serviços, cobraremos 20% do valor "
        "orçado.",
    )


def terms_filename(quote: Quote) -> str:
    return f"termos_orcamento_{short_quote_code(quote.id)}.pdf"


def format_valid_until(value: datetime | None) -> str:
    if not isinstance(value, datetime):
        return "-"
    return value.astimezone(SAO_PAULO_TIMEZONE).strftime("%d/%m/%Y")


class QuoteTermsPDFGenerator:
    def __init__(self, logo_path: Path | None = LOGO_PATH):
        self.logo_path = logo_path
        styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            "TermsTitle",
            parent=styles["Heading1"],
            fontSize=14,
            leading=17,
            textColor=TEXT_DARK,
            alignment=TA_RIGHT,
            spaceAfter=4,
        )
        self.subtitle_style = ParagraphStyle(
            "TermsSubtitle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=TEXT_MUTED,
            alignment=TA_RIGHT,
        )
        self.section_style = ParagraphStyle(
            "TermsSection",
            parent=styles["Heading2"],
            fontSize=11,
            textColor=TEXT_DARK,
            spaceBefore=8,
            spaceAfter=4,
        )
        self.normal_style = ParagraphStyle(
            "TermsNormal",
            parent=styles["Normal"],
            fontSize=9,
            leading=12.5,
            textColor=TEXT,
        )
        self.issuer_style = ParagraphStyle(
            "TermsIssuer",
            parent=self.normal_style,
            fontSize=8,
            leading=11,
            textColor=TEXT_MUTED,
            alignment=TA_LEFT,
        )

    def generate(self, quote: Quote) -> bytes:
        quote_code = short_quote_code(quote.id)
        valid_until = format_valid_until(quote.valid_until)
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=1.5 * cm,
            bottomMargin=2 * cm,
            title=f"Termos e condições do orçamento #{quote_code}",
            author=ALIANCA_TRADUCOES.trade_name,
        )

        elements = self._header(quote, quote_code, valid_until)
        elements += self._paragraphs("Informações importantes", IMPORTANT_INFORMATION)
        elements += self._paragraphs("Informações de pagamento", PAYMENT_INFORMATION)
        elements += self._bullets("Condições da proposta", proposal_conditions(valid_until))
        elements += self._bullets("Oferecemos também", ADDITIONAL_SERVICES)
        elements.append(Spacer(1, 0.4 * cm))
        elements.append(
            Paragraph(
                "Ao aprovar o orçamento pela página de aprovação, o cliente declara que leu e "
                "aceita estes termos e condições.",
                self.normal_style,
            )
        )

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
                f"{ALIANCA_TRADUCOES.phone} · atendimento@aliancatraducoes.com.br",
            )
            canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Página {document.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_footer, onLaterPages=draw_footer)
        return buffer.getvalue()

    def _header(self, quote: Quote, quote_code: str, valid_until: str) -> list:
        issuer = ALIANCA_TRADUCOES
        logo: Image | str = ""
        if self.logo_path and self.logo_path.exists():
            logo = Image(str(self.logo_path), width=1.8 * cm, height=1.8 * cm)
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
            Paragraph("TERMOS E CONDIÇÕES", self.title_style),
            Paragraph(f"Orçamento <b>#{quote_code}</b>", self.subtitle_style),
            Paragraph(f"Válido até {valid_until}", self.subtitle_style),
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
        customer = quote.company_name or quote.enterprise or quote.customer_name
        summary = [
            f"Valor total (incluindo os impostos): <b>R$ {format_brl(quote.total_value)}</b>"
        ]
        if customer:
            summary.insert(0, f"Cliente: <b>{escape(customer)}</b>")
        return [
            header,
            Spacer(1, 0.4 * cm),
            Paragraph("<br/>".join(summary), self.normal_style),
            Spacer(1, 0.2 * cm),
        ]

    def _paragraphs(self, title: str, paragraphs: tuple[str, ...]) -> list:
        body = [Paragraph(text, self.normal_style) for text in paragraphs]
        spaced: list = []
        for paragraph in body:
            spaced += [paragraph, Spacer(1, 0.15 * cm)]
        return [KeepTogether([Paragraph(title, self.section_style), *spaced[:2]]), *spaced[2:]]

    def _bullets(self, title: str, items: tuple[str, ...]) -> list:
        bullets = ListFlowable(
            [ListItem(Paragraph(text, self.normal_style), leftIndent=12) for text in items],
            bulletType="bullet",
            bulletFontSize=7,
            leftIndent=12,
        )
        return [Paragraph(title, self.section_style), bullets]


def generate_quote_terms_pdf(quote: Quote) -> bytes:
    return QuoteTermsPDFGenerator().generate(quote)
