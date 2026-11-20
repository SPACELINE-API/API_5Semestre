import io
import re
import zipfile
from xml.etree import ElementTree

from pypdf import PdfReader
from pypdf.errors import PyPdfError

WORD_PATTERN = re.compile(r"[^\W_]+(?:[-'’][^\W_]+)*")
DOCX_NAMESPACE = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DOCX_TEXT_PARTS = re.compile(r"^word/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$")
TEXT_EXTENSIONS = (".txt", ".md", ".csv")


def count_text_words(text: str) -> int:
    return len(WORD_PATTERN.findall(text))


def _pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _docx_text(data: bytes) -> str | None:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        parts = sorted(name for name in archive.namelist() if DOCX_TEXT_PARTS.match(name))
        if not parts:
            return None
        paragraphs: list[str] = []
        for name in parts:
            root = ElementTree.fromstring(archive.read(name))
            for paragraph in root.iter(f"{DOCX_NAMESPACE}p"):
                paragraphs.append(
                    "".join(node.text or "" for node in paragraph.iter(f"{DOCX_NAMESPACE}t"))
                )
        return "\n".join(paragraphs)


def _plain_text(data: bytes, filename: str) -> str | None:
    if not filename.lower().endswith(TEXT_EXTENSIONS) or b"\x00" in data:
        return None
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("latin-1")


def count_document_words(data: bytes, filename: str = "") -> int | None:
    text: str | None
    try:
        if data.startswith(b"%PDF"):
            text = _pdf_text(data)
        elif zipfile.is_zipfile(io.BytesIO(data)):
            text = _docx_text(data)
        else:
            text = _plain_text(data, filename)
    except (PyPdfError, zipfile.BadZipFile, ElementTree.ParseError, ValueError, KeyError):
        return None

    if text is None:
        return None
    words = count_text_words(text)
    return words or None
