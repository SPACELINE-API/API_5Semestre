CREATE TYPE task_status AS ENUM ('pending');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    due_date DATE,
    status task_status NOT NULL DEFAULT 'pending',
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_task_requester_idempotency UNIQUE (requester_id, idempotency_key)
);

CREATE TABLE task_translators (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    translator_id UUID NOT NULL REFERENCES translators(id) ON DELETE RESTRICT,
    PRIMARY KEY (task_id, translator_id)
);

CREATE TABLE task_execution_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL DEFAULT 'task.create',
    result VARCHAR(50) NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
