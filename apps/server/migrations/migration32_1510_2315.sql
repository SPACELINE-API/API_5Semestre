INSERT INTO storage.buckets (id, name, public)
VALUES
    ('translator-certificates', 'translator-certificates', false)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS translator_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translator_id UUID NOT NULL REFERENCES translators(id) ON DELETE CASCADE,
    language_id VARCHAR(20) NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    proficiency_level VARCHAR(20) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    review_note VARCHAR(500),
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_translator_certificate_language UNIQUE (translator_id, language_id),
    CONSTRAINT ck_translator_certificates_status
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS ix_translator_certificates_translator_id
    ON translator_certificates (translator_id);
CREATE INDEX IF NOT EXISTS ix_translator_certificates_language_id
    ON translator_certificates (language_id);
