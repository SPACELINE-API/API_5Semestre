ALTER TABLE service_order_files
    ADD COLUMN IF NOT EXISTS service_order_item_id UUID
        REFERENCES service_order_items (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_service_order_files_service_order_item_id
    ON service_order_files (service_order_item_id);
