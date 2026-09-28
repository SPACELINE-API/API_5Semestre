-- Running upgrade -> service_orders_extra_fields

ALTER TABLE service_orders ADD COLUMN domain_area VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN price_category VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN internal_notes TEXT;
ALTER TABLE service_orders ADD COLUMN external_notes TEXT;

CREATE TABLE service_order_files (
    id UUID NOT NULL,
    service_order_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(service_order_id) REFERENCES service_orders (id) ON DELETE CASCADE
);

CREATE INDEX ix_service_order_files_service_order_id ON service_order_files (service_order_id);
