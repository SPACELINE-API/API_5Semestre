UPDATE quotes
SET status = 'pending'
WHERE status = 'draft';

ALTER TABLE quotes
    ALTER COLUMN status SET DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reproved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reproval_reason VARCHAR(500);
