ALTER TABLE quotes ALTER COLUMN status SET DEFAULT 'draft';

UPDATE quotes
SET status = 'draft'
WHERE status = 'pending';
