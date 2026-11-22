INSERT INTO permissions (id, code, description)
VALUES (
    gen_random_uuid(),
    'proposals.report.generate',
    'Gerar relatórios consolidados de propostas'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, report_permission.id
FROM roles
JOIN role_permissions proposal_access ON proposal_access.role_id = roles.id
JOIN permissions proposal_permission ON proposal_permission.id = proposal_access.permission_id
CROSS JOIN permissions report_permission
WHERE proposal_permission.code = 'proposals.read'
  AND report_permission.code = 'proposals.report.generate'
ON CONFLICT DO NOTHING;
