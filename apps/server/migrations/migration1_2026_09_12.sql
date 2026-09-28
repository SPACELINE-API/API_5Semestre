CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS translators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technical_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS translator_qualifications (
    translator_id UUID NOT NULL REFERENCES translators(id) ON DELETE CASCADE,
    qualification_id UUID NOT NULL REFERENCES technical_qualifications(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (translator_id, qualification_id)
);

CREATE TABLE IF NOT EXISTS language_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    CONSTRAINT uq_language_pair_source_target UNIQUE (source_language, target_language)
);

CREATE TABLE IF NOT EXISTS translator_language_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translator_id UUID NOT NULL REFERENCES translators(id) ON DELETE CASCADE,
    language_pair_id UUID NOT NULL REFERENCES language_pairs(id) ON DELETE RESTRICT,
    proficiency_level VARCHAR(20) NOT NULL,
    CONSTRAINT uq_translator_language_pair UNIQUE (translator_id, language_pair_id)
);

CREATE INDEX IF NOT EXISTS ix_translators_email ON translators (email);
CREATE INDEX IF NOT EXISTS ix_technical_qualifications_name ON technical_qualifications (name);
CREATE INDEX IF NOT EXISTS ix_translator_language_pairs_translator_id ON translator_language_pairs (translator_id);
CREATE INDEX IF NOT EXISTS ix_translator_language_pairs_language_pair_id ON translator_language_pairs (language_pair_id);
