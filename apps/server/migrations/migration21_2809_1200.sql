DROP TABLE IF EXISTS translator_language_pairs;
DROP TABLE IF EXISTS language_pairs;

CREATE TABLE IF NOT EXISTS translator_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translator_id UUID NOT NULL REFERENCES translators(id) ON DELETE CASCADE,
    language_id VARCHAR(20) NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    proficiency_level VARCHAR(20) NOT NULL,
    CONSTRAINT uq_translator_language UNIQUE (translator_id, language_id)
);

CREATE INDEX IF NOT EXISTS ix_translator_languages_translator_id
    ON translator_languages (translator_id);
CREATE INDEX IF NOT EXISTS ix_translator_languages_language_id
    ON translator_languages (language_id);
