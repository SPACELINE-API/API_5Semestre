ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE;

UPDATE users SET password_set_at = created_at WHERE password_set_at IS NULL;

CREATE TABLE IF NOT EXISTS password_setup_tokens (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_password_setup_tokens_status
        CHECK (status IN ('pendente', 'aceito', 'rejeitado', 'expirado'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_password_setup_tokens_token_hash
    ON password_setup_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_password_setup_tokens_user_status
    ON password_setup_tokens (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_password_setup_tokens_one_pending
    ON password_setup_tokens (user_id) WHERE status = 'pendente';
