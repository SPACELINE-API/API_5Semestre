from app.modules.system_parameters.models.language import Language
from app.shared.database import get_session_factory


def seed_languages() -> list[Language]:
    languages_data = [
        {"name": "Africâner", "id": "af-ZA"},
        {"name": "Albanês", "id": "sq-AL"},
        {"name": "Alemão", "id": "de-DE"},
        {"name": "Amárico", "id": "am-ET"},
        {"name": "Árabe (Egito)", "id": "ar-EG"},
        {"name": "Azerbaijano", "id": "az-AZ"},
        {"name": "Bengali", "id": "bn-BD"},
        {"name": "Bielorrusso", "id": "be-BY"},
        {"name": "Bósnio", "id": "bs-BA"},
        {"name": "Búlgaro", "id": "bg-BG"},
        {"name": "Catalão", "id": "ca"},
        {"name": "Cazaque", "id": "kk-KZ"},
        {"name": "Chinês (Simp-HK)", "id": "zh-Hans-HK"},
        {"name": "Chinês (Simp-Mandarim)", "id": "zh-Hans"},
        {"name": "Chinês (Trad-Cantonês)", "id": "zh-Hant"},
        {"name": "Chinês (Trad-TW)", "id": "zh-TW"},
        {"name": "Coreano", "id": "ko-KR"},
        {"name": "Crioulo Haitiano", "id": "ha"},
        {"name": "Croata", "id": "hr-HR"},
        {"name": "Dinamarquês", "id": "da-DK"},
        {"name": "Espanhol (Colômbia)", "id": "es-CO"},
        {"name": "Eslovaco", "id": "sk-SK"},
        {"name": "Esloveno", "id": "sl-SI"},
        {"name": "Espanhol (Argentina)", "id": "es-AR"},
        {"name": "Espanhol (Espanha)", "id": "es-ES"},
        {"name": "Espanhol (LATAM)", "id": "es-LA"},
        {"name": "Espanhol (México)", "id": "es-MX"},
        {"name": "Finlandês", "id": "fi-FI"},
        {"name": "Filipino", "id": "fil-PH"},
        {"name": "Francês (Canadá)", "id": "fr-CA"},
        {"name": "Francês (França)", "id": "fr-FR"},
        {"name": "Georgiano", "id": "ka-GE"},
        {"name": "Grego", "id": "el-GR"},
        {"name": "Gujarati", "id": "gu-IN"},
        {"name": "Hebraico", "id": "he"},
        {"name": "Hindi", "id": "hi-IN"},
        {"name": "Holandês", "id": "nl-NL"},
        {"name": "Húngaro", "id": "hu-HU"},
        {"name": "Indonésio", "id": "id-ID"},
        {"name": "Inglês (Austrália)", "id": "en-AU"},
        {"name": "Inglês (Canadá)", "id": "en-CA"},
        {"name": "Inglês (EUA)", "id": "en-US"},
        {"name": "Inglês (Reino Unido)", "id": "en-GB"},
        {"name": "Italiano", "id": "it-IT"},
        {"name": "Islandês", "id": "is-IS"},
        {"name": "Japonês", "id": "ja-JP"},
        {"name": "Khmer", "id": "km-KH"},
        {"name": "Kannada", "id": "kn-IN"},
        {"name": "Laosiano", "id": "lo-LA"},
        {"name": "Latim", "id": "la"},
        {"name": "Letão", "id": "lv-LV"},
        {"name": "LIBRAS", "id": "sgn-BR"},
        {"name": "Lituano", "id": "lt-LT"},
        {"name": "Macedônio", "id": "mk-MK"},
        {"name": "Malaio", "id": "ms"},
        {"name": "Malaiala", "id": "ml-IN"},
        {"name": "Marata", "id": "mr-IN"},
        {"name": "Birmanês", "id": "my-MM"},
        {"name": "Mongol", "id": "mn"},
        {"name": "Nepalês", "id": "ne-NP"},
        {"name": "Norueguês (Bokmål)", "id": "nb-NO"},
        {"name": "Persa", "id": "fa-IR"},
        {"name": "Punjabi", "id": "pa-IN"},
        {"name": "Polonês", "id": "pl-PL"},
        {"name": "Português (Angola)", "id": "pt-AO"},
        {"name": "Português (Brasil)", "id": "pt-BR"},
        {"name": "Português (Moçambique)", "id": "pt-MZ"},
        {"name": "Português (Portugal)", "id": "pt-PT"},
        {"name": "Romeno", "id": "ro"},
        {"name": "Russo", "id": "ru-RU"},
        {"name": "Sérvio (Cirílico)", "id": "sr-Cyrl"},
        {"name": "Sérvio (Latim)", "id": "sr-Latn"},
        {"name": "Somali", "id": "so"},
        {"name": "Suaíli", "id": "sw-KE"},
        {"name": "Sueco", "id": "sv-SE"},
        {"name": "Tailandês", "id": "th"},
        {"name": "Tamil", "id": "ta-IN"},
        {"name": "Tcheco", "id": "cs-CZ"},
        {"name": "Telugu", "id": "te-IN"},
        {"name": "Tigrínia", "id": "ti-ET"},
        {"name": "Turco", "id": "tr-TR"},
        {"name": "Ucraniano", "id": "uk-UA"},
        {"name": "Umbundu (Angola)", "id": "umb"},
        {"name": "Urdu", "id": "ur-PK"},
        {"name": "Uzbeque", "id": "uz-UZ"},
        {"name": "Vietnamita", "id": "vi"},
        {"name": "Galês", "id": "cy-GB"},
        {"name": "Iorubá", "id": "yo-NG"},
        {"name": "Zulu", "id": "zu-ZA"},
    ]

    session_factory = get_session_factory()

    with session_factory() as db:
        existing_languages = {lang.id for lang in db.query(Language).all()}
        new_languages = []

        for data in languages_data:
            if data["id"] not in existing_languages:
                new_languages.append(Language(id=data["id"], name=data["name"]))

        if new_languages:
            db.add_all(new_languages)
            db.commit()

        return db.query(Language).all()
