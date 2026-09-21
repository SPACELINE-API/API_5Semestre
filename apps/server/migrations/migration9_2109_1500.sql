-- Running upgrade -> service_order_items_manual_entry

ALTER TABLE service_order_items ALTER COLUMN quote_translation_item_id DROP NOT NULL;
ALTER TABLE service_order_items ADD COLUMN word_count INTEGER;
