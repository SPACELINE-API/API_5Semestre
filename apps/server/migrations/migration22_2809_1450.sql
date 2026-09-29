ALTER TABLE request
    ADD COLUMN IF NOT EXISTS reproved_by UUID,
    ADD COLUMN IF NOT EXISTS reproved_by_email VARCHAR(255);
