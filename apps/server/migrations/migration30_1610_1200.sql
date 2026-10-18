WITH menu_permissions(code, description) AS (
    VALUES
        ('dashboard.read', 'Acessar o painel'),
        ('assignments.read', 'Consultar tarefas atribuídas'),
        ('requests.read', 'Consultar requisições'),
        ('quotes.read', 'Consultar orçamentos'),
        ('service_orders.read', 'Consultar ordens de serviço'),
        ('clients.read', 'Consultar clientes'),
        ('translators.read', 'Consultar tradutores'),
        ('support.read', 'Acessar suporte'),
        ('users.read', 'Consultar usuários'),
        ('users.write', 'Gerenciar usuários'),
        ('roles.read', 'Consultar perfis de acesso'),
        ('roles.write', 'Gerenciar perfis de acesso'),
        ('clients.write', 'Gerenciar clientes'),
        ('contacts.read', 'Consultar contatos'),
        ('contacts.write', 'Gerenciar contatos'),
        ('requests.write', 'Gerenciar requisições'),
        ('quotes.write', 'Gerenciar orçamentos'),
        ('quotes.approve', 'Aprovar orçamentos'),
        ('service_orders.write', 'Gerenciar ordens de serviço'),
        ('translators.write', 'Gerenciar tradutores'),
        ('assignments.write', 'Gerenciar tarefas atribuídas'),
        ('assignments.manage', 'Administrar tarefas atribuídas'),
        ('assignments.respond', 'Responder tarefas atribuídas'),
        ('documents.read', 'Consultar documentos'),
        ('documents.write', 'Gerenciar documentos'),
        ('support.write', 'Enviar solicitações ao suporte'),
        ('settings.read', 'Consultar configurações'),
        ('settings.write', 'Gerenciar configurações'),
        ('finance.read', 'Consultar informações financeiras'),
        ('finance.write', 'Gerenciar informações financeiras')
)
INSERT INTO permissions (id, code, description)
SELECT gen_random_uuid(), menu_permissions.code, menu_permissions.description
FROM menu_permissions
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, name, description, is_active)
VALUES (gen_random_uuid(), 'Operador', 'Acessa as áreas do sistema em leitura e responde tarefas atribuídas.', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE lower(roles.name) IN ('administrador', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE lower(roles.name) = 'operador'
ON CONFLICT DO NOTHING;

UPDATE users
SET role = 'operador'
WHERE lower(email) = 'operador@spaceline.com.br'
  AND lower(role) = 'tradutor';

DELETE FROM user_roles
USING users, roles
WHERE user_roles.user_id = users.id
  AND user_roles.role_id = roles.id
  AND lower(users.email) = 'operador@spaceline.com.br'
  AND lower(roles.name) = 'recursos externos';

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles
  ON (lower(users.role) = 'admin' AND lower(roles.name) IN ('administrador', 'admin'))
  OR (lower(users.role) = 'tradutor' AND lower(roles.name) = 'recursos externos')
  OR (lower(users.role) = 'operador' AND lower(roles.name) = 'operador')
ON CONFLICT DO NOTHING;
