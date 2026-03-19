-- Agent Snapshots for full versioning & rollback
CREATE TABLE agent_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    version_label TEXT NOT NULL,
    trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'publish', 'export', 'auto', 'pre_edit')),
    snapshot_data JSONB NOT NULL, -- full agent config + file contents
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_snapshots_agent ON agent_snapshots(agent_id);
CREATE INDEX idx_agent_snapshots_created ON agent_snapshots(agent_id, created_at DESC);

ALTER TABLE agent_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent snapshots"
    ON agent_snapshots FOR ALL
    USING (auth.jwt()->>'sub' = user_id);

-- Agent health status (materialized from sync events)
CREATE TABLE agent_health (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'offline', 'unknown')),
    last_heartbeat TIMESTAMPTZ,
    last_error TIMESTAMPTZ,
    last_error_message TEXT,
    error_count_1h INT DEFAULT 0,
    total_runs_24h INT DEFAULT 0,
    successful_runs_24h INT DEFAULT 0,
    active_frameworks TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_health_user ON agent_health(user_id);
CREATE INDEX idx_agent_health_status ON agent_health(status);

ALTER TABLE agent_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent health"
    ON agent_health FOR ALL
    USING (auth.jwt()->>'sub' = user_id);

-- Alert rules for agent monitoring
CREATE TABLE agent_alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- NULL = all agents
    condition TEXT NOT NULL CHECK (condition IN ('offline', 'error_rate', 'run_failed', 'degraded')),
    threshold INT DEFAULT 1,
    notify_via TEXT NOT NULL DEFAULT 'webhook' CHECK (notify_via IN ('webhook', 'email')),
    webhook_url TEXT,
    email TEXT,
    enabled BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_alert_rules_user ON agent_alert_rules(user_id);

ALTER TABLE agent_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alert rules"
    ON agent_alert_rules FOR ALL
    USING (auth.jwt()->>'sub' = user_id);
