ALTER TABLE request ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE request SET created_at = request_date::timestamptz WHERE created_at >= now() - interval '1 minute';
CREATE INDEX IF NOT EXISTS ix_request_created_at ON request (created_at DESC);
