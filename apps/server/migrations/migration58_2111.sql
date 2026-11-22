INSERT INTO permissions (id, code, description)
VALUES
    (gen_random_uuid(), 'tasks.read', 'Acessar a área de tarefas'),
    (gen_random_uuid(), 'tasks.write', 'Criar e acompanhar tarefas atribuídas pelo usuário'),
    (gen_random_uuid(), 'tasks.assigned_to_me.read', 'Visualizar e executar tarefas atribuídas ao usuário')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE lower(trim(roles.name)) NOT IN ('recursos externos', 'tradutor', 'tradutora')
  AND permissions.code IN ('tasks.read', 'tasks.assigned_to_me.read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN role_permissions existing_permissions ON existing_permissions.role_id = roles.id
JOIN permissions existing_codes ON existing_codes.id = existing_permissions.permission_id
CROSS JOIN permissions
WHERE existing_codes.code = 'assignments.write'
  AND lower(trim(roles.name)) NOT IN ('recursos externos', 'tradutor', 'tradutora')
  AND permissions.code = 'tasks.write'
ON CONFLICT DO NOTHING;
