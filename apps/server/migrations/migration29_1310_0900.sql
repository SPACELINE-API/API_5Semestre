ALTER TABLE service_order_items
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE service_order_items
SET completed_at = updated_at
WHERE status = 'concluida' AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_service_order_items_translator_completed_at
    ON service_order_items (translator_id, completed_at);
