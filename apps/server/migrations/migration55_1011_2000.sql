ALTER TABLE service_order_items ADD COLUMN IF NOT EXISTS removed_from_quote_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS service_order_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    origin VARCHAR(40) NOT NULL,
    reason VARCHAR(500),
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    actor_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_order_versions_version UNIQUE (service_order_id, version)
);

CREATE INDEX IF NOT EXISTS ix_service_order_versions_service_order_id
    ON service_order_versions (service_order_id);

INSERT INTO service_order_versions (service_order_id, version, origin, changes, created_at)
SELECT service_orders.id, 1, 'quote_approval', '[]'::jsonb, service_orders.created_at
FROM service_orders
WHERE service_orders.quote_id IS NOT NULL
ON CONFLICT (service_order_id, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS quote_receipt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    pdf_url VARCHAR(500),
    total_value VARCHAR(30),
    approved_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quote_receipt_versions_version UNIQUE (quote_id, version)
);

CREATE INDEX IF NOT EXISTS ix_quote_receipt_versions_quote_id
    ON quote_receipt_versions (quote_id);

INSERT INTO quote_receipt_versions (
    quote_id, version, status, pdf_url, approved_at, generated_at, sent_at, error_message
)
SELECT id, 1, receipt_status, receipt_pdf_url, approved_at, receipt_generated_at,
    receipt_sent_at, receipt_error_message
FROM quotes
WHERE receipt_status IS NOT NULL
ON CONFLICT (quote_id, version) DO NOTHING;
