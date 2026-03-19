-- Cluster Orchestration Rules
CREATE TABLE cluster_orchestration_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('condition', 'dependency', 'priority')),
    from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    condition_expr TEXT, -- e.g. "sentiment < 0.3", "output contains 'escalate'"
    priority INT DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orch_rules_cluster ON cluster_orchestration_rules(cluster_id);

ALTER TABLE cluster_orchestration_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their orchestration rules" ON cluster_orchestration_rules
    FOR ALL USING (user_id = auth.jwt()->>'sub');

-- Orchestration task queue
CREATE TABLE cluster_task_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    source_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES cluster_orchestration_rules(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'blocked')),
    priority INT DEFAULT 0,
    input_message TEXT NOT NULL,
    output_message TEXT,
    blocked_by UUID REFERENCES cluster_task_queue(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_task_queue_cluster ON cluster_task_queue(cluster_id);
CREATE INDEX idx_task_queue_status ON cluster_task_queue(cluster_id, status);
CREATE INDEX idx_task_queue_agent ON cluster_task_queue(assigned_agent_id);

ALTER TABLE cluster_task_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their task queues" ON cluster_task_queue
    FOR ALL USING (user_id = auth.jwt()->>'sub');

-- Agent analytics (token usage and cost tracking)
CREATE TABLE agent_usage_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    source_framework TEXT NOT NULL DEFAULT 'web',
    run_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    avg_latency_ms INT DEFAULT 0,
    UNIQUE(agent_id, date, source_framework)
);

CREATE INDEX idx_usage_daily_agent ON agent_usage_daily(agent_id);
CREATE INDEX idx_usage_daily_user ON agent_usage_daily(user_id);
CREATE INDEX idx_usage_daily_date ON agent_usage_daily(date DESC);

ALTER TABLE agent_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own usage" ON agent_usage_daily
    FOR ALL USING (user_id = auth.jwt()->>'sub');

-- Token budget alerts
CREATE TABLE agent_token_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- NULL = all agents
    monthly_budget_usd NUMERIC(10, 2) NOT NULL,
    alert_threshold_pct INT DEFAULT 80, -- alert at 80% of budget
    current_month_usage_usd NUMERIC(10, 6) DEFAULT 0,
    last_alert_at TIMESTAMPTZ,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_budgets_user ON agent_token_budgets(user_id);

ALTER TABLE agent_token_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their token budgets" ON agent_token_budgets
    FOR ALL USING (user_id = auth.jwt()->>'sub');
