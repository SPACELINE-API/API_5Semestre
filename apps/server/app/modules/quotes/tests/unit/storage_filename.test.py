import pytest

from app.shared.supabase.filenames import safe_storage_filename


@pytest.mark.parametrize(
    ("original", "expected"),
    [
        ("Formalização de Orientação de TG (1).doc", "Formalizacao_de_Orientacao_de_TG_1_.doc"),
        ("contrato.pdf", "contrato.pdf"),
        ("relatório final.docx", "relatorio_final.docx"),
        ("???", "arquivo"),
        ("", "arquivo"),
    ],
)
def test_safe_storage_filename_keeps_only_valid_key_characters(original, expected):
    assert safe_storage_filename(original) == expected


def test_safe_storage_filename_limits_length_and_keeps_extension():
    result = safe_storage_filename("a" * 300 + ".pdf")

    assert len(result) == 120
    assert result.endswith(".pdf")
