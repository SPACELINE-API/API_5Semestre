INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, read_permissions.id
FROM roles
JOIN role_permissions write_assignments ON write_assignments.role_id = roles.id
JOIN permissions write_permissions ON write_permissions.id = write_assignments.permission_id
JOIN permissions read_permissions ON read_permissions.code = 'users.read'
WHERE write_permissions.code = 'users.write'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, read_permissions.id
FROM roles
JOIN role_permissions write_assignments ON write_assignments.role_id = roles.id
JOIN permissions write_permissions ON write_permissions.id = write_assignments.permission_id
JOIN permissions read_permissions ON read_permissions.code = 'settings.read'
WHERE write_permissions.code = 'settings.write'
ON CONFLICT DO NOTHING;
