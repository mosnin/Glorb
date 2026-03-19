import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

  // Tool: Pull agent manifest
  server.tool(
    "pull_agent",
    "Get a complete agent manifest ready for local use, including all file contents",
    { agent_id: z.string().describe("The agent ID to pull") },
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

      const files: Record<string, string> = {};
      for (const file of agent.agent_files || []) {
        const { data: blob } = await supabase.storage.from("agent-files").download(file.storage_path);
        if (blob) files[file.file_path] = await blob.text();
      }

      const manifest = {
        type: "agent",
        id: agent.id,
        name: agent.name,
        description: agent.description,
        configuration: agent.configuration,
        files,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(manifest, null, 2) }],
      };
    }
  );

  // Tool: Pull cluster manifest
  server.tool(
    "pull_cluster",
    "Get a complete cluster manifest ready for local use, including all agents and file contents",
    { cluster_id: z.string().describe("The cluster ID to pull") },
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

      const clusterFiles: Record<string, string> = {};
      for (const file of cluster.cluster_files || []) {
        const { data: blob } = await supabase.storage.from("agent-files").download(file.storage_path);
        if (blob) clusterFiles[file.file_path] = await blob.text();
      }

      const agents = [];
      for (const ca of cluster.cluster_agents || []) {
        const agent = ca.agent;
        if (!agent) continue;

        const { data: agentFiles } = await supabase.from("agent_files").select("*").eq("agent_id", agent.id);
        const files: Record<string, string> = {};
        for (const f of agentFiles || []) {
          const { data: blob } = await supabase.storage.from("agent-files").download(f.storage_path);
          if (blob) files[f.file_path] = await blob.text();
        }

        agents.push({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          role: ca.role_in_cluster,
          configuration: agent.configuration,
          files,
        });
      }

      const manifest = {
        type: "cluster",
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        manager_agent_id: cluster.manager_agent_id,
        handoff_definitions: cluster.handoff_definitions,
        cluster_files: clusterFiles,
        agents,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(manifest, null, 2) }],
      };
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
