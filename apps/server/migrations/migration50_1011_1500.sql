-- TAREFAS PASSAM A TER EXATAMENTE UM FUNCIONARIO INTERNO RESPONSAVEL.
-- AS TAREFAS ANTIGAS ERAM ATRIBUIDAS A TRADUTORES E NAO TEM RESPONSAVEL INTERNO; SAO REMOVIDAS.
DELETE FROM task_proposals;
DELETE FROM tasks;
DROP TABLE task_translators;

-- NOVOS STATUS DO FLUXO DE EXECUCAO E AVALIACAO
ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
ALTER TYPE task_status RENAME TO task_status_old;
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'in_review', 'completed', 'rejected');
ALTER TABLE tasks ALTER COLUMN status TYPE task_status USING status::text::task_status;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'pending';
DROP TYPE task_status_old;

ALTER TABLE tasks
    ADD COLUMN assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ADD COLUMN execution_description TEXT,
    ADD COLUMN rejection_reason TEXT,
    ADD COLUMN reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

CREATE INDEX ix_tasks_assignee_status ON tasks (assignee_id, status);

CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_task_attachments_task_id ON task_attachments (task_id);

CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_task_history_task_id ON task_history (task_id);

-- BUCKET PRIVADO DOS ANEXOS; O ACESSO ACONTECE SOMENTE POR URL ASSINADA
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- PERMISSOES DE CRIACAO (ENDPOINT E AGENTE) E DE AVALIACAO DAS TAREFAS
INSERT INTO permissions (id, code, description)
VALUES
    (gen_random_uuid(), 'tasks.write', 'Criar tarefas para funcionários internos'),
    (gen_random_uuid(), 'tasks.review', 'Consultar, aprovar e reprovar tarefas dos funcionários')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE (permissions.code IN ('tasks.write', 'tasks.review')
       AND lower(roles.name) IN ('administrador', 'admin'))
   OR (permissions.code = 'tasks.write' AND lower(roles.name) = 'projetos')
ON CONFLICT DO NOTHING;
