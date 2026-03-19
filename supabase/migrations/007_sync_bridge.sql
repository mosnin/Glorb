-- Sync Bridge: cross-framework activity feed for agents

CREATE TABLE agent_sync_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    source_framework TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'run_started', 'run_completed', 'run_failed',
        'tool_called', 'decision_made', 'output_produced',
        'memory_stored', 'error', 'heartbeat'
    )),
    payload JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sync_events_agent ON agent_sync_events(agent_id);
CREATE INDEX idx_sync_events_created ON agent_sync_events(agent_id, created_at DESC);
CREATE INDEX idx_sync_events_session ON agent_sync_events(session_id) WHERE session_id IS NOT NULL;

-- Cluster sync: shared context docs visible to all agents in a cluster
CREATE TABLE cluster_context_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    doc_type TEXT DEFAULT 'shared_context' CHECK (doc_type IN ('shared_context', 'decision_log', 'status_update', 'handoff_note')),
    author_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    author_framework TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_context_docs_cluster ON cluster_context_docs(cluster_id);

-- RLS
ALTER TABLE agent_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_context_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their sync events" ON agent_sync_events
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users manage context docs through clusters" ON cluster_context_docs
    FOR ALL USING (
        cluster_id IN (SELECT id FROM clusters WHERE user_id = auth.jwt()->>'sub')
    );
