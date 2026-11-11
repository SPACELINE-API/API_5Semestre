ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS validity_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ix_quotes_status_validity_starts_at
    ON quotes (status, validity_starts_at);
