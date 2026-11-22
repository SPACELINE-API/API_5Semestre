CREATE TABLE IF NOT EXISTS quote_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    actor_user_id UUID,
    actor_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_quote_audit_logs_quote_id
    ON quote_audit_logs (quote_id);

INSERT INTO permissions (id, code, description)
VALUES (
    gen_random_uuid(),
    'quotes.reopen',
    'Reabrir orçamentos bloqueados para edição'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE permissions.code = 'quotes.reopen'
  AND lower(roles.name) IN ('administrador', 'admin')
ON CONFLICT DO NOTHING;
