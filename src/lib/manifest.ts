import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * glorb.json — The Universal Agent Manifest
 *
 * This is the portable format that any agentic framework can consume.
 * It contains everything needed to instantiate an agent: identity, prompt,
 * role, skills (tool definitions), config, memory, cluster context,
 * and sync webhook URL.
 */

export interface GlorbAgentManifest {
  glorb_version: "1.0";
  type: "agent";
  id: string;
  name: string;
  description: string | null;
  status: string;

  // Core agent definition
  prompt: string | null;
  role: string | null;
  skills: GlorbSkill[];
  config: Record<string, unknown>;

  // All raw files
  files: Record<string, { content: string; type: string }>;

  // Memory snapshot
  memories: { key: string; value: string }[];

  // Cluster context (if agent belongs to any cluster)
  clusters: GlorbClusterContext[];

  // Sync endpoints
  sync: {
    events_url: string;
    webhook_url: string;
    activity_feed_url: string;
    heartbeat_url: string;
    directives_url: string;
    memories_url: string;
    files_url: string;
  };

  // Metadata
  manifest_version: string;
  config_updated_at: string;
  pulled_at: string;
  source_url: string;
}

export interface GlorbSkill {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface GlorbClusterContext {
  cluster_id: string;
  cluster_name: string;
  role_in_cluster: string | null;
  peer_agents: { id: string; name: string; role: string | null }[];
  handoff_definitions: unknown[];
  context_docs: { title: string; content: string; doc_type: string }[];
}

export interface GlorbClusterManifest {
  glorb_version: "1.0";
  type: "cluster";
  id: string;
  name: string;
  description: string | null;
  manager_agent_id: string | null;
  handoff_definitions: unknown[];
  interaction_map: Record<string, unknown>;

  agents: GlorbAgentManifest[];
  cluster_files: Record<string, { content: string; type: string }>;
  context_docs: { title: string; content: string; doc_type: string }[];

  sync: {
    events_url: string;
    webhook_url: string;
  };

  pulled_at: string;
  source_url: string;
}

export async function buildAgentManifest(
  agentId: string,
  userId: string,
  baseUrl: string
): Promise<GlorbAgentManifest> {
  const supabase = createAdminSupabaseClient();

  // Load agent with files
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*, agent_files(*)")
    .eq("id", agentId)
    .single();

  if (error || !agent) throw new Error("Agent not found");

  // Download all file contents
  const files: Record<string, { content: string; type: string }> = {};
  let prompt: string | null = null;
  let role: string | null = null;
  const skills: GlorbSkill[] = [];

  for (const f of agent.agent_files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(f.storage_path);
    const content = blob ? await blob.text() : "";
    files[f.file_path] = { content, type: f.file_type };

    if (f.file_type === "prompt" || f.file_path === "prompt.md") prompt = content;
    if (f.file_type === "role" || f.file_path === "role.md") role = content;
    if (f.file_type === "skill") {
      try {
        const parsed = JSON.parse(content);
        if (parsed.name && parsed.input_schema) {
          skills.push({
            name: parsed.name,
            description: parsed.description || "",
            input_schema: parsed.input_schema,
          });
        }
      } catch { /* skip */ }
    }
  }

  // Load memories
  const { data: memories } = await supabase
    .from("agent_memories")
    .select("key, value")
    .eq("agent_id", agentId)
    .eq("user_id", userId);

  // Load cluster context
  const { data: clusterAgents } = await supabase
    .from("cluster_agents")
    .select("cluster_id, role_in_cluster, cluster:clusters(id, name, handoff_definitions)")
    .eq("agent_id", agentId);

  const clusters: GlorbClusterContext[] = [];
  for (const ca of clusterAgents || []) {
    const cluster = ca.cluster as unknown as { id: string; name: string; handoff_definitions: unknown[] } | null;
    if (!cluster) continue;

    // Peer agents
    const { data: peers } = await supabase
      .from("cluster_agents")
      .select("agent_id, role_in_cluster, agent:agents(id, name)")
      .eq("cluster_id", cluster.id)
      .neq("agent_id", agentId);

    // Context docs
    const { data: docs } = await supabase
      .from("cluster_context_docs")
      .select("title, content, doc_type")
      .eq("cluster_id", cluster.id)
      .order("created_at", { ascending: false })
      .limit(20);

    clusters.push({
      cluster_id: cluster.id,
      cluster_name: cluster.name,
      role_in_cluster: ca.role_in_cluster,
      peer_agents: (peers || []).map((p) => ({
        id: (p.agent as unknown as { id: string; name: string })?.id || p.agent_id,
        name: (p.agent as unknown as { id: string; name: string })?.name || "Unknown",
        role: p.role_in_cluster,
      })),
      handoff_definitions: cluster.handoff_definitions || [],
      context_docs: docs || [],
    });
  }

  // Build a version hash from agent updated_at + file count + memory count
  const versionInput = `${agent.updated_at}:${(agent.agent_files || []).length}:${(memories || []).length}`;
  const manifestVersion = Buffer.from(versionInput).toString("base64url").slice(0, 12);

  return {
    glorb_version: "1.0",
    type: "agent",
    id: agent.id,
    name: agent.name,
    description: agent.description,
    status: agent.status,
    prompt,
    role,
    skills,
    config: agent.configuration || {},
    files,
    memories: memories || [],
    clusters,
    sync: {
      events_url: `${baseUrl}/api/v1/agents/${agentId}/sync`,
      webhook_url: `${baseUrl}/api/v1/agents/${agentId}/sync`,
      activity_feed_url: `${baseUrl}/api/v1/agents/${agentId}/sync?feed=true`,
      heartbeat_url: `${baseUrl}/api/v1/agents/${agentId}/heartbeat`,
      directives_url: `${baseUrl}/api/v1/agents/${agentId}/directives`,
      memories_url: `${baseUrl}/api/v1/agents/${agentId}/memories`,
      files_url: `${baseUrl}/api/v1/agents/${agentId}/files`,
    },
    manifest_version: manifestVersion,
    config_updated_at: agent.updated_at,
    pulled_at: new Date().toISOString(),
    source_url: `${baseUrl}/agents/${agentId}`,
  };
}

export async function buildClusterManifest(
  clusterId: string,
  userId: string,
  baseUrl: string
): Promise<GlorbClusterManifest> {
  const supabase = createAdminSupabaseClient();

  const { data: cluster, error } = await supabase
    .from("clusters")
    .select("*, cluster_agents(agent_id, role_in_cluster), cluster_files(*)")
    .eq("id", clusterId)
    .single();

  if (error || !cluster) throw new Error("Cluster not found");

  // Build agent manifests for each agent in cluster
  const agents: GlorbAgentManifest[] = [];
  for (const ca of cluster.cluster_agents || []) {
    try {
      const agentManifest = await buildAgentManifest(ca.agent_id, userId, baseUrl);
      agents.push(agentManifest);
    } catch { /* skip if agent not found */ }
  }

  // Cluster files
  const clusterFiles: Record<string, { content: string; type: string }> = {};
  for (const f of cluster.cluster_files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(f.storage_path);
    clusterFiles[f.file_path] = {
      content: blob ? await blob.text() : "",
      type: f.file_type,
    };
  }

  // Context docs
  const { data: docs } = await supabase
    .from("cluster_context_docs")
    .select("title, content, doc_type")
    .eq("cluster_id", clusterId)
    .order("created_at", { ascending: false });

  return {
    glorb_version: "1.0",
    type: "cluster",
    id: cluster.id,
    name: cluster.name,
    description: cluster.description,
    manager_agent_id: cluster.manager_agent_id,
    handoff_definitions: cluster.handoff_definitions || [],
    interaction_map: cluster.interaction_map || {},
    agents,
    cluster_files: clusterFiles,
    context_docs: docs || [],
    sync: {
      events_url: `${baseUrl}/api/v1/clusters/${clusterId}/sync`,
      webhook_url: `${baseUrl}/api/v1/clusters/${clusterId}/sync`,
    },
    pulled_at: new Date().toISOString(),
    source_url: `${baseUrl}/clusters/${clusterId}`,
  };
}
