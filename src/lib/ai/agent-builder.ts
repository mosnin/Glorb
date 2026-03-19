import { createClient } from "@supabase/supabase-js";

// Server-side agent builder that executes tool calls from the AI
// Uses the service role client since this runs server-side during chat

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function storagePath(userId: string, type: "agents" | "clusters", entityId: string, filePath: string) {
  return `${userId}/${type}/${entityId}/${filePath}`;
}

async function uploadFile(bucket: string, path: string, content: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([content], { type: "text/plain" }), {
      upsert: true,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  const supabase = getAdminClient();

  switch (toolName) {
    case "create_agent": {
      const { name, description, prompt_content, role_content } = args as {
        name: string;
        description: string;
        prompt_content: string;
        role_content?: string;
      };

      // Create agent record
      const { data: agent, error } = await supabase
        .from("agents")
        .insert({ user_id: userId, name, description })
        .select()
        .single();

      if (error) throw new Error(`Failed to create agent: ${error.message}`);

      // Upload prompt.md
      const promptPath = storagePath(userId, "agents", agent.id, "prompt.md");
      await uploadFile("agent-files", promptPath, prompt_content);

      const { error: fileError } = await supabase.from("agent_files").insert({
        agent_id: agent.id,
        file_name: "prompt.md",
        file_path: "prompt.md",
        file_type: "prompt",
        storage_path: promptPath,
        size_bytes: new Blob([prompt_content]).size,
      });
      if (fileError) throw new Error(`Failed to create prompt file record: ${fileError.message}`);

      // Upload role.md if provided
      if (role_content) {
        const rolePath = storagePath(userId, "agents", agent.id, "role.md");
        await uploadFile("agent-files", rolePath, role_content);

        await supabase.from("agent_files").insert({
          agent_id: agent.id,
          file_name: "role.md",
          file_path: "role.md",
          file_type: "role",
          storage_path: rolePath,
          size_bytes: new Blob([role_content]).size,
        });
      }

      // Create default config.json
      const config = { model: "gpt-4o", temperature: 0.7, max_tokens: 4096 };
      const configPath = storagePath(userId, "agents", agent.id, "config.json");
      await uploadFile("agent-files", configPath, JSON.stringify(config, null, 2));

      await supabase.from("agent_files").insert({
        agent_id: agent.id,
        file_name: "config.json",
        file_path: "config.json",
        file_type: "config",
        storage_path: configPath,
        mime_type: "application/json",
        size_bytes: new Blob([JSON.stringify(config)]).size,
      });

      return {
        success: true,
        agent_id: agent.id,
        name: agent.name,
        message: `Agent "${name}" created with prompt.md, role.md, and config.json`,
      };
    }

    case "create_agent_file": {
      const { agent_id, file_path, file_type, content } = args as {
        agent_id: string;
        file_path: string;
        file_type: string;
        content: string;
      };

      // Get agent to verify ownership
      const { data: agent } = await supabase
        .from("agents")
        .select("id, user_id")
        .eq("id", agent_id)
        .single();

      if (!agent) throw new Error("Agent not found");

      const sPath = storagePath(userId, "agents", agent_id, file_path);
      await uploadFile("agent-files", sPath, content);

      const fileName = file_path.split("/").pop() || file_path;

      // Upsert file record
      const { error } = await supabase.from("agent_files").upsert(
        {
          agent_id,
          file_name: fileName,
          file_path,
          file_type,
          storage_path: sPath,
          mime_type: file_path.endsWith(".json") ? "application/json" : "text/markdown",
          size_bytes: new Blob([content]).size,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,file_path" }
      );

      if (error) throw new Error(`Failed to create file: ${error.message}`);

      return {
        success: true,
        file_path,
        message: `File "${file_path}" created/updated for agent ${agent_id}`,
      };
    }

    case "create_cluster": {
      const { name, description, cluster_prompt_content } = args as {
        name: string;
        description: string;
        cluster_prompt_content: string;
      };

      const { data: cluster, error } = await supabase
        .from("clusters")
        .insert({ user_id: userId, name, description })
        .select()
        .single();

      if (error) throw new Error(`Failed to create cluster: ${error.message}`);

      // Upload cluster_prompt.md
      const promptPath = storagePath(userId, "clusters", cluster.id, "cluster_prompt.md");
      await uploadFile("agent-files", promptPath, cluster_prompt_content);

      await supabase.from("cluster_files").insert({
        cluster_id: cluster.id,
        file_name: "cluster_prompt.md",
        file_path: "cluster_prompt.md",
        file_type: "cluster_prompt",
        storage_path: promptPath,
        size_bytes: new Blob([cluster_prompt_content]).size,
      });

      // Create default config.json
      const config = { coordination_strategy: "manager_directed" };
      const configPath = storagePath(userId, "clusters", cluster.id, "config.json");
      await uploadFile("agent-files", configPath, JSON.stringify(config, null, 2));

      await supabase.from("cluster_files").insert({
        cluster_id: cluster.id,
        file_name: "config.json",
        file_path: "config.json",
        file_type: "config",
        storage_path: configPath,
        mime_type: "application/json",
        size_bytes: new Blob([JSON.stringify(config)]).size,
      });

      return {
        success: true,
        cluster_id: cluster.id,
        name: cluster.name,
        message: `Cluster "${name}" created with cluster_prompt.md and config.json`,
      };
    }

    case "add_agent_to_cluster": {
      const { cluster_id, agent_id, role_in_cluster } = args as {
        cluster_id: string;
        agent_id: string;
        role_in_cluster: string;
      };

      const { error } = await supabase.from("cluster_agents").insert({
        cluster_id,
        agent_id,
        role_in_cluster,
      });

      if (error) throw new Error(`Failed to add agent to cluster: ${error.message}`);

      return {
        success: true,
        message: `Agent ${agent_id} added to cluster ${cluster_id} as "${role_in_cluster}"`,
      };
    }

    case "set_manager_agent": {
      const { cluster_id, agent_id } = args as {
        cluster_id: string;
        agent_id: string;
      };

      const { error } = await supabase
        .from("clusters")
        .update({ manager_agent_id: agent_id, updated_at: new Date().toISOString() })
        .eq("id", cluster_id);

      if (error) throw new Error(`Failed to set manager: ${error.message}`);

      return {
        success: true,
        message: `Agent ${agent_id} set as manager of cluster ${cluster_id}`,
      };
    }

    case "define_handoff": {
      const { cluster_id, from_agent_id, to_agent_id, condition, description } = args as {
        cluster_id: string;
        from_agent_id: string;
        to_agent_id: string;
        condition: string;
        description?: string;
      };

      // Fetch current handoff definitions
      const { data: cluster } = await supabase
        .from("clusters")
        .select("handoff_definitions, interaction_map")
        .eq("id", cluster_id)
        .single();

      if (!cluster) throw new Error("Cluster not found");

      const handoffs = [...(cluster.handoff_definitions || [])];
      handoffs.push({ from_agent_id, to_agent_id, condition, description });

      // Update interaction map
      const map = { ...(cluster.interaction_map || {}) };
      if (!map[from_agent_id]) map[from_agent_id] = [];
      if (!map[from_agent_id].includes(to_agent_id)) {
        map[from_agent_id].push(to_agent_id);
      }

      const { error } = await supabase
        .from("clusters")
        .update({
          handoff_definitions: handoffs,
          interaction_map: map,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cluster_id);

      if (error) throw new Error(`Failed to define handoff: ${error.message}`);

      return {
        success: true,
        message: `Handoff defined: ${from_agent_id} → ${to_agent_id} when "${condition}"`,
      };
    }

    case "create_cluster_file": {
      const { cluster_id, file_path, file_type, content } = args as {
        cluster_id: string;
        file_path: string;
        file_type: string;
        content: string;
      };

      const sPath = storagePath(userId, "clusters", cluster_id, file_path);
      await uploadFile("agent-files", sPath, content);

      const fileName = file_path.split("/").pop() || file_path;

      const { error } = await supabase.from("cluster_files").upsert(
        {
          cluster_id,
          file_name: fileName,
          file_path,
          file_type,
          storage_path: sPath,
          mime_type: file_path.endsWith(".json") ? "application/json" : "text/markdown",
          size_bytes: new Blob([content]).size,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cluster_id,file_path" }
      );

      if (error) throw new Error(`Failed to create cluster file: ${error.message}`);

      return {
        success: true,
        file_path,
        message: `File "${file_path}" created/updated for cluster ${cluster_id}`,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
