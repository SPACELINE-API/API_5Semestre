ALTER TABLE request
    ADD COLUMN IF NOT EXISTS document_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS document_content_type VARCHAR(100);
