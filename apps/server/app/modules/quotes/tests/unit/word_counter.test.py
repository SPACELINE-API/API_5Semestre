import io
import zipfile

import pytest
from reportlab.pdfgen import canvas

from app.modules.quotes.services.word_counter import count_document_words, count_text_words

DOCX_DOCUMENT = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    "<w:body>{paragraphs}</w:body></w:document>"
)
DOCX_HEADER = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    "{paragraphs}</w:hdr>"
)


def make_pdf(*lines: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    for index, line in enumerate(lines):
        pdf.drawString(72, 720 - index * 20, line)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def docx_paragraphs(*paragraphs: str) -> str:
    return "".join(f"<w:p><w:r><w:t>{paragraph}</w:t></w:r></w:p>" for paragraph in paragraphs)


def make_docx(*paragraphs: str, header: str | None = None) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr(
            "word/document.xml",
            DOCX_DOCUMENT.format(paragraphs=docx_paragraphs(*paragraphs)),
        )
        if header is not None:
            archive.writestr(
                "word/header1.xml", DOCX_HEADER.format(paragraphs=docx_paragraphs(header))
            )
    return buffer.getvalue()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Contrato de prestação de serviços", 5),
        ("guarda-chuva d'água", 2),
        ("Cláusula 1ª: R$ 1.500,00", 6),
        ("  \n\t ", 0),
        ("— ... !!", 0),
    ],
)
def test_counts_words_in_text(text: str, expected: int) -> None:
    assert count_text_words(text) == expected


def test_counts_words_in_pdf() -> None:
    data = make_pdf("Certidao de nascimento", "Registro civil das pessoas naturais")

    assert count_document_words(data, "certidao.pdf") == 8


def test_counts_words_in_docx_body_and_header() -> None:
    data = make_docx("Contrato social da empresa", "Segunda clausula", header="Cartorio")

    assert count_document_words(data, "contrato.docx") == 7


def test_counts_words_in_text_file() -> None:
    data = "Procuração para representação legal".encode()

    assert count_document_words(data, "procuracao.txt") == 4


def test_detects_pdf_even_without_extension() -> None:
    data = make_pdf("Historico escolar completo")

    assert count_document_words(data, "blob") == 3


def test_returns_none_for_pdf_without_text() -> None:
    assert count_document_words(make_pdf(), "digitalizado.pdf") is None


@pytest.mark.parametrize(
    ("data", "filename"),
    [
        (b"%PDF-1.4 arquivo corrompido", "corrompido.pdf"),
        (b"PK\x03\x04 zip quebrado", "quebrado.docx"),
        (b"\x89PNG\r\n\x1a\n\x00\x00\x00", "foto.png"),
        (b"texto sem extensao conhecida", "arquivo.bin"),
    ],
)
def test_returns_none_when_words_cannot_be_counted(data: bytes, filename: str) -> None:
    assert count_document_words(data, filename) is None


def test_returns_none_for_zip_that_is_not_docx() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("planilha.csv", "a,b,c")

    assert count_document_words(buffer.getvalue(), "arquivos.zip") is None
