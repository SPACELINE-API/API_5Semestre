ALTER TABLE service_order_files
    ADD COLUMN storage_path VARCHAR(500),
    ADD COLUMN content_type VARCHAR(150),
    ADD COLUMN delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
    ADD CONSTRAINT ck_service_order_files_delivery_status
        CHECK (delivery_status IN ('not_sent', 'pending', 'sent', 'failed'));

CREATE TABLE service_order_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL
        REFERENCES service_orders(id) ON DELETE CASCADE,
    document_file_id UUID NOT NULL
        REFERENCES service_order_files(id) ON DELETE RESTRICT,
    recipient_email VARCHAR(255),
    cc_email VARCHAR(255),
    template_key VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_service_order_deliveries_status
        CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX ix_service_order_deliveries_service_order_id
    ON service_order_deliveries (service_order_id);
CREATE INDEX ix_service_order_deliveries_document_file_id
    ON service_order_deliveries (document_file_id);
