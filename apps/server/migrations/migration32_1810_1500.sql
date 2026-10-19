UPDATE users
SET role = 'tradutor'
WHERE lower(email) = 'operador@spaceline.com.br';

DELETE FROM user_roles
USING roles
WHERE user_roles.role_id = roles.id
  AND lower(roles.name) = 'operador';

DELETE FROM role_permissions
USING roles
WHERE role_permissions.role_id = roles.id
  AND lower(roles.name) = 'operador';

DELETE FROM roles
WHERE lower(name) = 'operador';

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles
  ON lower(users.role) = 'tradutor' AND lower(roles.name) = 'recursos externos'
ON CONFLICT DO NOTHING;
