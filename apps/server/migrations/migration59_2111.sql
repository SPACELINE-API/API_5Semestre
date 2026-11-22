INSERT INTO permissions (id, code, description)
VALUES
    (gen_random_uuid(), 'languages.read', 'Acessar o gerenciamento de idiomas'),
    (gen_random_uuid(), 'languages.write', 'Cadastrar e remover idiomas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN role_permissions existing_permissions ON existing_permissions.role_id = roles.id
JOIN permissions existing_codes ON existing_codes.id = existing_permissions.permission_id
CROSS JOIN permissions
WHERE existing_codes.code = 'settings.write'
  AND permissions.code = 'languages.read'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN role_permissions existing_permissions ON existing_permissions.role_id = roles.id
JOIN permissions existing_codes ON existing_codes.id = existing_permissions.permission_id
CROSS JOIN permissions
WHERE existing_codes.code = 'settings.write'
  AND permissions.code = 'languages.write'
ON CONFLICT DO NOTHING;
