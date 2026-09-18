from app.modules.system_parameters.models.language import Language
from app.shared.database import get_session_factory


def seed_languages() -> list[Language]:
    languages_data = [
        {"name": "Albanês", "id": "sq-AL"},
        {"name": "Alemão", "id": "de-DE"},
        {"name": "Árabe (Egito)", "id": "ar-EG"},
        {"name": "Búlgaro", "id": "bg-BG"},
        {"name": "Catalão", "id": "ca"},
        {"name": "Chinês (Simp-HK)", "id": "zh-Hans-HK"},
        {"name": "Chinês (Simp-Mandarim)", "id": "zh-Hans"},
        {"name": "Chinês (Trad-Cantonês)", "id": "zh-Hant"},
        {"name": "Chinês (Trad-TW)", "id": "zh-TW"},
        {"name": "Coreano", "id": "ko-KR"},
        {"name": "Crioulo Haitiano", "id": "ha"},
        {"name": "Croata", "id": "hr-HR"},
        {"name": "Dinamarquês", "id": "da-DK"},
        {"name": "Eslovaco", "id": "sk-SK"},
        {"name": "Esloveno", "id": "sl-SI"},
        {"name": "Espanhol (Argentina)", "id": "es-AR"},
        {"name": "Espanhol (Espanha)", "id": "es-ES"},
        {"name": "Espanhol (LATAM)", "id": "es-LA"},
        {"name": "Espanhol (México)", "id": "es-MX"},
        {"name": "Finlandês", "id": "fi-FI"},
        {"name": "Francês (Canadá)", "id": "fr-CA"},
        {"name": "Francês (França)", "id": "fr-FR"},
        {"name": "Grego", "id": "el-GR"},
        {"name": "Hebraico", "id": "he"},
        {"name": "Hindi", "id": "hi-IN"},
        {"name": "Holandês", "id": "nl-NL"},
        {"name": "Húngaro", "id": "hu-HU"},
        {"name": "Inglês (Austrália)", "id": "en-AU"},
        {"name": "Inglês (Canadá)", "id": "en-CA"},
        {"name": "Inglês (EUA)", "id": "en-US"},
        {"name": "Inglês (Reino Unido)", "id": "en-GB"},
        {"name": "Italiano", "id": "it-IT"},
        {"name": "Japonês", "id": "ja-JP"},
        {"name": "Laosiano", "id": "lo-LA"},
        {"name": "Latim", "id": "la"},
        {"name": "Letão", "id": "lv-LV"},
        {"name": "LIBRAS", "id": "sgn-BR"},
        {"name": "Lituano", "id": "lt-LT"},
        {"name": "Malaio", "id": "ms"},
        {"name": "Mongol", "id": "mn"},
        {"name": "Norueguês (Bokmål)", "id": "nb-NO"},
        {"name": "Persa", "id": "fa-IR"},
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
        {"name": "Sueco", "id": "sv-SE"},
        {"name": "Tailandês", "id": "th"},
        {"name": "Tcheco", "id": "cs-CZ"},
        {"name": "Turco", "id": "tr-TR"},
        {"name": "Ucraniano", "id": "uk-UA"},
        {"name": "Umbundu (Angola)", "id": "umb"},
        {"name": "Urdu", "id": "ur-PK"},
        {"name": "Vietnamita", "id": "vi"},
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
