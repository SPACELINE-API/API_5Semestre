CREATE TABLE IF NOT EXISTS quote_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    pdf_url VARCHAR(500),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ck_quote_receipts_status CHECK (status IN ('available', 'sent', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_quote_receipts_company_id ON quote_receipts(company_id);

CREATE OR REPLACE FUNCTION update_quote_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quote_receipts_updated_at ON quote_receipts;

CREATE TRIGGER trigger_update_quote_receipts_updated_at
    BEFORE UPDATE ON quote_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_receipts_updated_at();
