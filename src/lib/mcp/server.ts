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

  // Tool: Write memories back to Glorb
  server.tool(
    "store_memories",
    "Store or update agent memories in Glorb. Memories are synced across all runtimes.",
    {
      agent_id: z.string().describe("The agent ID"),
      user_id: z.string().describe("The user ID"),
      memories: z.array(z.object({
        key: z.string(),
        value: z.string(),
      })).describe("Array of key-value pairs to store"),
    },
    async ({ agent_id, user_id, memories }) => {
      const supabase = createAdminSupabaseClient();
      const rows = memories.map((m) => ({
        agent_id,
        user_id,
        key: m.key,
        value: m.value,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("agent_memories")
        .upsert(rows, { onConflict: "agent_id,user_id,key" })
        .select("key, value");

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text" as const, text: `Stored ${data?.length || 0} memories` }] };
    }
  );

  // Tool: Send heartbeat
  server.tool(
    "heartbeat",
    "Send a heartbeat for this agent runtime. Returns pending directives and config freshness info.",
    {
      agent_id: z.string().describe("The agent ID"),
      user_id: z.string().describe("The user ID"),
      source_framework: z.string().describe("Framework name (e.g. claude-code)"),
      status: z.enum(["running", "idle", "paused"]).optional().describe("Current status"),
    },
    async ({ agent_id, user_id, source_framework, status }) => {
      const supabase = createAdminSupabaseClient();

      await supabase.from("agent_heartbeats").upsert(
        {
          agent_id,
          user_id,
          source_framework,
          session_id: null,
          status: status || "running",
          metadata: {},
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,source_framework,session_id" }
      );

      // Get pending directives
      const { data: directives } = await supabase
        .from("agent_directives")
        .select("*")
        .eq("agent_id", agent_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(10);

      // Get config freshness
      const { data: agent } = await supabase
        .from("agents")
        .select("updated_at")
        .eq("id", agent_id)
        .single();

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            directives: directives || [],
            config_updated_at: agent?.updated_at,
          }, null, 2),
        }],
      };
    }
  );

  // Tool: Poll directives
  server.tool(
    "poll_directives",
    "Check for pending directives (tasks/commands) assigned to this agent from the Glorb UI.",
    {
      agent_id: z.string().describe("The agent ID"),
      acknowledge: z.boolean().optional().describe("Auto-mark as delivered (default: true)"),
    },
    async ({ agent_id, acknowledge }) => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("agent_directives")
        .select("*")
        .eq("agent_id", agent_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      // Auto-acknowledge
      if (acknowledge !== false && data && data.length > 0) {
        await supabase
          .from("agent_directives")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .in("id", data.map((d) => d.id));
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Tool: Complete directive
  server.tool(
    "complete_directive",
    "Mark a directive as completed with an optional result.",
    {
      agent_id: z.string().describe("The agent ID"),
      directive_id: z.string().describe("The directive ID to complete"),
      result: z.record(z.string(), z.unknown()).optional().describe("Result data"),
    },
    async ({ agent_id, directive_id, result }) => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("agent_directives")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: result || {},
        })
        .eq("id", directive_id)
        .eq("agent_id", agent_id)
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Tool: Push file to Glorb
  server.tool(
    "push_file",
    "Push a file to the agent's Glorb storage. Creates or updates the file.",
    {
      agent_id: z.string().describe("The agent ID"),
      user_id: z.string().describe("The user ID"),
      file_path: z.string().describe("File path (e.g. 'prompt.md', 'skills/search.json')"),
      content: z.string().describe("File content"),
      file_type: z.string().optional().describe("File type (prompt, role, skill, doc, code, file)"),
    },
    async ({ agent_id, user_id, file_path, content, file_type }) => {
      const supabase = createAdminSupabaseClient();
      const fileName = file_path.split("/").pop() || file_path;
      const storagePath = `${user_id}/${agent_id}/${file_path}`;
      const contentBlob = new Blob([content], { type: "text/plain" });

      const { error: uploadError } = await supabase.storage
        .from("agent-files")
        .upload(storagePath, contentBlob, { upsert: true, contentType: "text/plain" });

      if (uploadError) {
        return { content: [{ type: "text" as const, text: `Upload error: ${uploadError.message}` }] };
      }

      const inferredType = file_type || (file_path.includes("prompt") ? "prompt" :
        file_path.includes("role") ? "role" :
        file_path.includes("skill") ? "skill" : "file");

      const { data, error } = await supabase
        .from("agent_files")
        .upsert({
          agent_id,
          file_name: fileName,
          file_path,
          file_type: inferredType,
          storage_path: storagePath,
          size_bytes: new TextEncoder().encode(content).length,
        }, { onConflict: "agent_id,file_path" })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text" as const, text: `File saved: ${file_path} (${data.size_bytes} bytes)` }] };
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
