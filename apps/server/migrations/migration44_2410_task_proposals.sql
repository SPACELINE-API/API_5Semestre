CREATE TYPE task_proposal_status AS ENUM ('pending', 'consumed');

CREATE TABLE task_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload_hash VARCHAR(64) NOT NULL,
    status task_proposal_status NOT NULL DEFAULT 'pending',
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_task_proposals_requester_status ON task_proposals (requester_id, status);
