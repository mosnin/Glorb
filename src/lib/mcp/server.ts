import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildAgentManifest, buildClusterManifest } from "@/lib/manifest";
import { generateAdapter, type Framework } from "@/lib/adapters";

export function createGlorbMcpServer() {
  const server = new McpServer({
    name: "glorb",
    version: "1.0.0",
  });

  // Tool: List agents
  server.tool(
    "list_agents",
    "List all agents for the authenticated user",
    { user_id: z.string().describe("The user ID to list agents for") },
    async ({ user_id }) => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, description, status")
        .eq("user_id", user_id)
        .order("updated_at", { ascending: false });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // Tool: List clusters
  server.tool(
    "list_clusters",
    "List all clusters for the authenticated user",
    { user_id: z.string().describe("The user ID to list clusters for") },
    async ({ user_id }) => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("clusters")
        .select("id, name, description, status, cluster_agents(agent_id, role_in_cluster)")
        .eq("user_id", user_id)
        .order("updated_at", { ascending: false });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // Tool: Get agent with all files
  server.tool(
    "get_agent",
    "Get a complete agent configuration including all file contents",
    { agent_id: z.string().describe("The agent ID to fetch") },
    async ({ agent_id }) => {
      const supabase = createAdminSupabaseClient();

      const { data: agent, error } = await supabase
        .from("agents")
        .select("*, agent_files(*)")
        .eq("id", agent_id)
        .single();

      if (error || !agent) {
        return { content: [{ type: "text" as const, text: "Agent not found" }] };
      }

      // Fetch file contents from storage
      const filesWithContent = [];
      for (const file of agent.agent_files || []) {
        const { data: blob } = await supabase.storage
          .from("agent-files")
          .download(file.storage_path);

        const content = blob ? await blob.text() : "";
        filesWithContent.push({
          ...file,
          content,
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...agent, agent_files: filesWithContent }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Get cluster with all agents and files
  server.tool(
    "get_cluster",
    "Get a complete cluster configuration including all agents and file contents",
    { cluster_id: z.string().describe("The cluster ID to fetch") },
    async ({ cluster_id }) => {
      const supabase = createAdminSupabaseClient();

      const { data: cluster, error } = await supabase
        .from("clusters")
        .select("*, cluster_agents(*, agent:agents(*)), cluster_files(*)")
        .eq("id", cluster_id)
        .single();

      if (error || !cluster) {
        return { content: [{ type: "text" as const, text: "Cluster not found" }] };
      }

      // Fetch cluster file contents
      const clusterFiles = [];
      for (const file of cluster.cluster_files || []) {
        const { data: blob } = await supabase.storage
          .from("agent-files")
          .download(file.storage_path);
        clusterFiles.push({ ...file, content: blob ? await blob.text() : "" });
      }

      // Fetch agent files
      const agentsWithFiles = [];
      for (const ca of cluster.cluster_agents || []) {
        const agent = ca.agent;
        if (!agent) continue;

        const { data: agentFiles } = await supabase
          .from("agent_files")
          .select("*")
          .eq("agent_id", agent.id);

        const filesWithContent = [];
        for (const file of agentFiles || []) {
          const { data: blob } = await supabase.storage
            .from("agent-files")
            .download(file.storage_path);
          filesWithContent.push({ ...file, content: blob ? await blob.text() : "" });
        }

        agentsWithFiles.push({
          ...ca,
          agent: { ...agent, files: filesWithContent },
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { ...cluster, cluster_files: clusterFiles, cluster_agents: agentsWithFiles },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: Pull agent manifest (Glorb Universal Manifest format)
  server.tool(
    "pull_agent",
    "Pull a complete Glorb agent manifest with prompt, skills, files, memories, cluster context, and sync URLs. Ready for use in any framework.",
    {
      agent_id: z.string().describe("The agent ID to pull"),
      user_id: z.string().describe("The user ID (for auth)"),
      base_url: z.string().optional().describe("Base URL of the Glorb instance (defaults to https://glorb.vercel.app)"),
    },
    async ({ agent_id, user_id, base_url }) => {
      try {
        const manifest = await buildAgentManifest(agent_id, user_id, base_url || "https://glorb.vercel.app");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(manifest, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : "Failed to build manifest"}` }],
        };
      }
    }
  );

  // Tool: Pull cluster manifest
  server.tool(
    "pull_cluster",
    "Pull a complete Glorb cluster manifest with all agent manifests, context docs, and sync URLs.",
    {
      cluster_id: z.string().describe("The cluster ID to pull"),
      user_id: z.string().describe("The user ID (for auth)"),
      base_url: z.string().optional().describe("Base URL of the Glorb instance"),
    },
    async ({ cluster_id, user_id, base_url }) => {
      try {
        const manifest = await buildClusterManifest(cluster_id, user_id, base_url || "https://glorb.vercel.app");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(manifest, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : "Failed to build manifest"}` }],
        };
      }
    }
  );

  // Tool: Generate framework adapter
  server.tool(
    "generate_adapter",
    "Generate ready-to-use bootstrap files for a specific framework (claude-code, cursor, python, raw). Returns files to write locally.",
    {
      agent_id: z.string().describe("The agent ID"),
      user_id: z.string().describe("The user ID (for auth)"),
      framework: z.enum(["claude-code", "cursor", "python", "raw"]).describe("Target framework"),
      api_key: z.string().describe("API key for the generated adapter config"),
      base_url: z.string().optional().describe("Base URL of the Glorb instance"),
    },
    async ({ agent_id, user_id, framework, api_key, base_url }) => {
      try {
        const url = base_url || "https://glorb.vercel.app";
        const manifest = await buildAgentManifest(agent_id, user_id, url);
        const adapter = generateAdapter(manifest, framework as Framework, api_key, url);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(adapter, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : "Failed to generate adapter"}` }],
        };
      }
    }
  );

  // Tool: Report sync event
  server.tool(
    "report_sync_event",
    "Report an activity event (run_completed, tool_called, etc.) for cross-framework visibility.",
    {
      agent_id: z.string().describe("The agent ID"),
      user_id: z.string().describe("The user ID"),
      event_type: z.enum([
        "run_started", "run_completed", "run_failed",
        "tool_called", "decision_made", "output_produced",
        "memory_stored", "error", "heartbeat",
      ]).describe("Type of event"),
      source_framework: z.string().describe("Framework reporting the event (e.g. claude-code, cursor, python)"),
      payload: z.record(z.string(), z.unknown()).optional().describe("Event payload data"),
    },
    async ({ agent_id, user_id, event_type, source_framework, payload }) => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("agent_sync_events")
        .insert({
          agent_id,
          user_id,
          source_framework,
          event_type,
          payload: payload || {},
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Tool: Read activity feed
  server.tool(
    "read_activity_feed",
    "Read the cross-framework activity feed for an agent to see what other instances have been doing.",
    {
      agent_id: z.string().describe("The agent ID"),
      limit: z.number().optional().describe("Max events to return (default 20)"),
      since: z.string().optional().describe("ISO timestamp to filter events after"),
    },
    async ({ agent_id, limit, since }) => {
      const supabase = createAdminSupabaseClient();
      let query = supabase
        .from("agent_sync_events")
        .select("*")
        .eq("agent_id", agent_id)
        .order("created_at", { ascending: false })
        .limit(limit || 20);

      if (since) query = query.gte("created_at", since);

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Tool: Architect a new agent (delegates to AI)
  server.tool(
    "architect_agent",
    "Request Glorb to architect a new agent based on a description. Returns the created agent ID.",
    {
      user_id: z.string().describe("The user ID"),
      description: z.string().describe("Description of the agent to create"),
    },
    async ({ user_id, description }) => {
      // Create agent through the builder directly
      const { executeToolCall } = await import("@/lib/ai/agent-builder");

      const result = await executeToolCall(
        "create_agent",
        {
          name: description.split(" ").slice(0, 3).join(" "),
          description,
          prompt_content: `# Agent\n\nYou are an AI agent. ${description}\n\nFollow your instructions carefully and complete tasks thoroughly.`,
        },
        user_id
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
