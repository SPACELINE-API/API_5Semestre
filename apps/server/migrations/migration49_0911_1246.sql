CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    related_type VARCHAR(80),
    related_id UUID,
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CONSTRAINT uq_notifications_recipient_event UNIQUE (recipient_user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_notifications_recipient_created_at
    ON notifications (recipient_user_id, created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_recipient_read_at
    ON notifications (recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS ix_notifications_event_type
    ON notifications (event_type);
