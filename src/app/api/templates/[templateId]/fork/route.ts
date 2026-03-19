import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { templateId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: template, error } = await supabase
    .from("templates")
    .select("*, template_files(*)")
    .eq("id", templateId)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.type === "agent") {
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        configuration: template.configuration || {},
        status: "draft",
      })
      .select("id")
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }

    for (const file of template.template_files || []) {
      const storagePath = `${userId}/${agent.id}/${file.file_path}`;
      const blob = new Blob([file.content], { type: "text/plain" });
      await supabase.storage.from("agent-files").upload(storagePath, blob, { upsert: true });
      await supabase.from("agent_files").insert({
        agent_id: agent.id,
        file_name: file.file_name,
        file_path: file.file_path,
        file_type: file.file_type,
        storage_path: storagePath,
        mime_type: "text/plain",
        size_bytes: file.content.length,
      });
    }

    await supabase.from("templates").update({ use_count: (template.use_count || 0) + 1 }).eq("id", templateId);

    return NextResponse.json({ type: "agent", id: agent.id, name: template.name });
  }

  if (template.type === "cluster") {
    const clusterConfig = template.cluster_config || {};

    const { data: cluster, error: clusterError } = await supabase
      .from("clusters")
      .insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        handoff_definitions: clusterConfig.handoff_definitions || [],
        interaction_map: clusterConfig.interaction_map || {},
        status: "draft",
      })
      .select("id")
      .single();

    if (clusterError || !cluster) {
      return NextResponse.json({ error: "Failed to create cluster" }, { status: 500 });
    }

    const agentIdMap = new Map<string, string>();

    for (const agentConfig of clusterConfig.agents || []) {
      const { data: agent } = await supabase
        .from("agents")
        .insert({
          user_id: userId,
          name: agentConfig.name,
          description: agentConfig.description || "",
          configuration: agentConfig.configuration || {},
          status: "draft",
        })
        .select("id")
        .single();

      if (agent) {
        agentIdMap.set(agentConfig.id, agent.id);

        for (const file of agentConfig.files || []) {
          const storagePath = `${userId}/${agent.id}/${file.file_path}`;
          const blob = new Blob([file.content], { type: "text/plain" });
          await supabase.storage.from("agent-files").upload(storagePath, blob, { upsert: true });
          await supabase.from("agent_files").insert({
            agent_id: agent.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_type: file.file_type,
            storage_path: storagePath,
            mime_type: "text/plain",
            size_bytes: file.content.length,
          });
        }

        await supabase.from("cluster_agents").insert({
          cluster_id: cluster.id,
          agent_id: agent.id,
          role_in_cluster: agentConfig.role || null,
          position_x: agentConfig.position_x ?? 0,
          position_y: agentConfig.position_y ?? 0,
        });
      }
    }

    if (clusterConfig.manager_agent_id && agentIdMap.has(clusterConfig.manager_agent_id)) {
      await supabase.from("clusters").update({ manager_agent_id: agentIdMap.get(clusterConfig.manager_agent_id) }).eq("id", cluster.id);
    }

    for (const file of template.template_files || []) {
      const storagePath = `${userId}/clusters/${cluster.id}/${file.file_path}`;
      const blob = new Blob([file.content], { type: "text/plain" });
      await supabase.storage.from("agent-files").upload(storagePath, blob, { upsert: true });
      await supabase.from("cluster_files").insert({
        cluster_id: cluster.id,
        file_name: file.file_name,
        file_path: file.file_path,
        file_type: file.file_type,
        storage_path: storagePath,
        mime_type: "text/plain",
        size_bytes: file.content.length,
      });
    }

    await supabase.from("templates").update({ use_count: (template.use_count || 0) + 1 }).eq("id", templateId);

    return NextResponse.json({ type: "cluster", id: cluster.id, name: template.name });
  }

  return NextResponse.json({ error: "Unknown template type" }, { status: 400 });
}
