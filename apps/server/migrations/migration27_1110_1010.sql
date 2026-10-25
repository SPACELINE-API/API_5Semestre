INSERT INTO storage.buckets (id, name, public)
VALUES
    ('translator-photos', 'translator-photos', true)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    public = EXCLUDED.public;

ALTER TABLE translators
    ADD COLUMN IF NOT EXISTS photo_path VARCHAR(500),
    ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS photo_content_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS photo_size_bytes INTEGER;
