ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_access_token_hash VARCHAR(64);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_to_customer_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_to_customer_email VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotes_customer_access_token_hash
    ON quotes (customer_access_token_hash);
