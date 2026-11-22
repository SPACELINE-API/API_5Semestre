ALTER TABLE quotes ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS receipt_pdf_url VARCHAR(500);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS receipt_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS receipt_error_message TEXT;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS ck_quotes_receipt_status;
ALTER TABLE quotes ADD CONSTRAINT ck_quotes_receipt_status
    CHECK (receipt_status IS NULL OR receipt_status IN ('available', 'sent', 'error'));
