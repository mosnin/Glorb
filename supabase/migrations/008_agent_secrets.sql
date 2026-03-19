-- Agent Secrets Vault
-- Stores encrypted environment variables and API keys per agent.
-- Secrets are referenced in manifests as $GLORB_SECRET_<name> placeholders
-- and resolved only at runtime via authenticated API calls.

CREATE TABLE agent_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, name)
);

CREATE INDEX idx_agent_secrets_agent ON agent_secrets(agent_id);
CREATE INDEX idx_agent_secrets_user ON agent_secrets(user_id);

ALTER TABLE agent_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent secrets"
    ON agent_secrets FOR ALL
    USING (auth.jwt()->>'sub' = user_id);
