CREATE TABLE authorization_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('role', 'user')),
    target_id UUID,
    target_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    before JSONB,
    after JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_authorization_audit_logs_target
    ON authorization_audit_logs (target_type, target_id);

CREATE INDEX ix_authorization_audit_logs_created_at
    ON authorization_audit_logs (created_at);
