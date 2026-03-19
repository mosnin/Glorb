-- Row Level Security Policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Agents
CREATE POLICY "Users manage own agents" ON agents
    FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- Agent files (through agent ownership)
CREATE POLICY "Users manage own agent files" ON agent_files
    FOR ALL USING (
        agent_id IN (SELECT id FROM agents WHERE user_id = auth.jwt()->>'sub')
    );

-- Clusters
CREATE POLICY "Users manage own clusters" ON clusters
    FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- Cluster agents (through cluster ownership)
CREATE POLICY "Users manage own cluster agents" ON cluster_agents
    FOR ALL USING (
        cluster_id IN (SELECT id FROM clusters WHERE user_id = auth.jwt()->>'sub')
    );

-- Cluster files (through cluster ownership)
CREATE POLICY "Users manage own cluster files" ON cluster_files
    FOR ALL USING (
        cluster_id IN (SELECT id FROM clusters WHERE user_id = auth.jwt()->>'sub')
    );

-- Chat sessions
CREATE POLICY "Users manage own chat sessions" ON chat_sessions
    FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- Chat messages (through session ownership)
CREATE POLICY "Users manage own chat messages" ON chat_messages
    FOR ALL USING (
        session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.jwt()->>'sub')
    );

-- GitHub connections
CREATE POLICY "Users manage own github connections" ON github_connections
    FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- GitHub syncs (through connection ownership)
CREATE POLICY "Users manage own github syncs" ON github_syncs
    FOR ALL USING (
        github_connection_id IN (
            SELECT id FROM github_connections WHERE user_id = auth.jwt()->>'sub'
        )
    );

-- API keys
CREATE POLICY "Users manage own api keys" ON api_keys
    FOR ALL USING (auth.jwt()->>'sub' = user_id);
