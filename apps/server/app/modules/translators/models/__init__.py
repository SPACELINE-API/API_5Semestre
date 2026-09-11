# EXPORTACAO CENTRALIZADA DOS MODELS DO MODULO DE TRADUTORES
from app.modules.translators.models.language_pair import (
    LanguagePair,
    ProficiencyLevel,
    TranslatorLanguagePair,
)
from app.modules.translators.models.qualification import (
    TechnicalQualification,
    TranslatorQualification,
)
from app.modules.translators.models.translator import Translator

__all__ = [
    "LanguagePair",
    "ProficiencyLevel",
    "TechnicalQualification",
    "Translator",
    "TranslatorLanguagePair",
    "TranslatorQualification",
]
