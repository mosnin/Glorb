-- Migration: BYOR heartbeats and directives tables
-- Supports external runtime sync (heartbeat protocol + task queue)

-- Heartbeats: track connected external runtimes
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    source_framework TEXT NOT NULL DEFAULT 'unknown',
    session_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, source_framework, session_id)
);

CREATE INDEX idx_agent_heartbeats_agent ON agent_heartbeats(agent_id);
CREATE INDEX idx_agent_heartbeats_last_seen ON agent_heartbeats(last_seen_at DESC);

-- Directives: task queue for sending instructions to external runtimes
CREATE TABLE agent_directives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'task',
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_directives_agent ON agent_directives(agent_id);
CREATE INDEX idx_agent_directives_pending ON agent_directives(agent_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_directives_created ON agent_directives(created_at DESC);

-- RLS
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_directives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their agent heartbeats" ON agent_heartbeats
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users manage their agent directives" ON agent_directives
    FOR ALL USING (user_id = auth.jwt()->>'sub');
