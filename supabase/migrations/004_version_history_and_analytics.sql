-- Version History for Agent Files
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES agent_files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    change_source TEXT DEFAULT 'manual' CHECK (change_source IN ('manual', 'ai_chat', 'api', 'import')),
    change_summary TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);
CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX idx_file_versions_agent_id ON file_versions(agent_id);

-- Agent Test Cases
CREATE TABLE agent_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    input_message TEXT NOT NULL,
    expected_behavior TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_test_cases_agent_id ON agent_test_cases(agent_id);

-- Agent Test Runs
CREATE TABLE agent_test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'error')),
    total_cases INTEGER DEFAULT 0,
    passed_cases INTEGER DEFAULT 0,
    failed_cases INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_agent_test_runs_agent_id ON agent_test_runs(agent_id);

-- Individual Test Results
CREATE TABLE agent_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES agent_test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES agent_test_cases(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
    agent_response TEXT,
    evaluation_notes TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_test_results_run_id ON agent_test_results(run_id);

-- Activity Log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'cluster', 'file', 'chat', 'test', 'api_key')),
    entity_id UUID,
    entity_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Agent Run Stats (aggregated)
CREATE TABLE agent_run_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    UNIQUE(agent_id, date)
);
CREATE INDEX idx_agent_run_stats_agent_id ON agent_run_stats(agent_id);

-- RLS Policies
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage file versions through agents" ON file_versions
    FOR ALL USING (
        agent_id IN (SELECT id FROM agents WHERE user_id = auth.jwt()->>'sub')
    );

CREATE POLICY "Users can manage their test cases" ON agent_test_cases
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can manage their test runs" ON agent_test_runs
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view test results for their runs" ON agent_test_results
    FOR ALL USING (
        run_id IN (SELECT id FROM agent_test_runs WHERE user_id = auth.jwt()->>'sub')
    );

CREATE POLICY "Users can view their activity" ON activity_log
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can view stats for their agents" ON agent_run_stats
    FOR ALL USING (
        agent_id IN (SELECT id FROM agents WHERE user_id = auth.jwt()->>'sub')
    );
