INSERT INTO permissions (id, code, description)
VALUES (
    gen_random_uuid(),
    'proposals.read',
    'Consultar propostas e gerar relatórios consolidados'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE permissions.code = 'proposals.read'
  AND lower(roles.name) IN ('administrador', 'admin')
ON CONFLICT DO NOTHING;
