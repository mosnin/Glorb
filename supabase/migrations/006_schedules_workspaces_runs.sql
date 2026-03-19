-- Feature: Scheduling, Shared Workspaces, Run History/Observability

-- Agent Schedules (cron jobs)
CREATE TABLE agent_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    input_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_schedules_agent ON agent_schedules(agent_id);
CREATE INDEX idx_agent_schedules_next_run ON agent_schedules(next_run_at) WHERE is_active = true;

-- Shared Workspaces
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    member_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(owner_id, member_id)
);
CREATE INDEX idx_workspace_members_owner ON workspace_members(owner_id);
CREATE INDEX idx_workspace_members_member ON workspace_members(member_id);

-- Agent/Cluster collaborators (entity-level permissions override workspace role)
CREATE TABLE entity_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'cluster')),
    entity_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, user_id)
);
CREATE INDEX idx_entity_collaborators_entity ON entity_collaborators(entity_type, entity_id);
CREATE INDEX idx_entity_collaborators_user ON entity_collaborators(user_id);

-- Agent Run History (detailed observability)
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    input_message TEXT NOT NULL,
    output_message TEXT,
    trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'api', 'schedule', 'test')),
    schedule_id UUID REFERENCES agent_schedules(id) ON DELETE SET NULL,
    total_turns INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_started ON agent_runs(started_at DESC);

-- Run trace events (individual steps within a run)
CREATE TABLE agent_run_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('text', 'tool_use', 'tool_result', 'error', 'done')),
    turn_number INTEGER DEFAULT 1,
    content TEXT,
    tool_name TEXT,
    tool_input JSONB,
    tool_result TEXT,
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_run_events_run ON agent_run_events(run_id);

-- RLS
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their schedules" ON agent_schedules
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Owners manage workspace members" ON workspace_members
    FOR ALL USING (owner_id = auth.jwt()->>'sub' OR member_id = auth.jwt()->>'sub');

CREATE POLICY "Users view entity collaborations" ON entity_collaborators
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users view their runs" ON agent_runs
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users view run events for their runs" ON agent_run_events
    FOR ALL USING (
        run_id IN (SELECT id FROM agent_runs WHERE user_id = auth.jwt()->>'sub')
    );
