-- Feature: Publishing & Marketplace, Webhooks, Agent Memory

-- Marketplace: published agents/clusters discoverable publicly
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('agent', 'cluster')),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (agent_id IS NOT NULL AND cluster_id IS NULL) OR
        (agent_id IS NULL AND cluster_id IS NOT NULL)
    )
);
CREATE INDEX idx_marketplace_entity ON marketplace_listings(entity_type);
CREATE INDEX idx_marketplace_user ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_category ON marketplace_listings(category);

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhooks_user ON webhooks(user_id);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    attempt INTEGER DEFAULT 1,
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Agent Memory Store
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, user_id, key)
);
CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_lookup ON agent_memories(agent_id, user_id);

-- RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- Marketplace: anyone can read, owners can manage
CREATE POLICY "Public read marketplace" ON marketplace_listings
    FOR SELECT USING (true);

CREATE POLICY "Owners manage their listings" ON marketplace_listings
    FOR ALL USING (user_id = auth.jwt()->>'sub');

-- Webhooks: user access only
CREATE POLICY "Users manage their webhooks" ON webhooks
    FOR ALL USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users view their webhook deliveries" ON webhook_deliveries
    FOR ALL USING (
        webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.jwt()->>'sub')
    );

-- Memories: scoped to agent owner
CREATE POLICY "Users manage their agent memories" ON agent_memories
    FOR ALL USING (user_id = auth.jwt()->>'sub');
