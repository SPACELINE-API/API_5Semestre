ALTER TABLE service_order_files
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS review_note TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE service_order_files
    DROP CONSTRAINT IF EXISTS ck_service_order_files_review_status;

ALTER TABLE service_order_files
    ADD CONSTRAINT ck_service_order_files_review_status
    CHECK (review_status IN ('pending', 'approved', 'changes_requested'));
