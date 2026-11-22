ALTER TABLE password_setup_tokens DROP CONSTRAINT IF EXISTS ck_password_setup_tokens_status;
ALTER TABLE password_setup_tokens
    ADD CONSTRAINT ck_password_setup_tokens_status
    CHECK (status IN ('pendente', 'aceito', 'rejeitado', 'expirado', 'cancelado'));
