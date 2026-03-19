import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncToGitHub } from "@/lib/export/github";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agent_id, cluster_id, repo_full_name, branch } = body;

  if (!repo_full_name) {
    return NextResponse.json({ error: "repo_full_name required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Get GitHub connection
  const { data: connection } = await supabase
    .from("github_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No GitHub connection found" }, { status: 400 });
  }

  // Collect files to sync
  const files: { path: string; storagePath: string }[] = [];

  if (agent_id) {
    const { data: agent } = await supabase
      .from("agents")
      .select("name")
      .eq("id", agent_id)
      .single();
    const { data: agentFiles } = await supabase
      .from("agent_files")
      .select("file_path, storage_path")
      .eq("agent_id", agent_id);

    for (const f of agentFiles || []) {
      files.push({ path: `${agent?.name || "agent"}/${f.file_path}`, storagePath: f.storage_path });
    }
  } else if (cluster_id) {
    const { data: cluster } = await supabase
      .from("clusters")
      .select("name, cluster_agents(agent:agents(id, name)), cluster_files(file_path, storage_path)")
      .eq("id", cluster_id)
      .single();

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Cluster-level files
    for (const f of cluster.cluster_files || []) {
      files.push({ path: f.file_path, storagePath: f.storage_path });
    }

    // Agent files within cluster
    for (const ca of cluster.cluster_agents || []) {
      const agent = ca.agent as unknown as { id: string; name: string } | null;
      if (!agent) continue;

      const { data: agentFiles } = await supabase
        .from("agent_files")
        .select("file_path, storage_path")
        .eq("agent_id", agent.id);

      for (const f of agentFiles || []) {
        files.push({
          path: `agents/${agent.name}/${f.file_path}`,
          storagePath: f.storage_path,
        });
      }
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files to sync" }, { status: 400 });
  }

  const result = await syncToGitHub({
    accessToken: connection.access_token,
    repoFullName: repo_full_name,
    branch: branch || "main",
    files,
  });

  // Track sync
  await supabase.from("github_syncs").upsert(
    {
      github_connection_id: connection.id,
      agent_id: agent_id || null,
      cluster_id: cluster_id || null,
      repo_full_name,
      branch: branch || "main",
      last_synced_at: new Date().toISOString(),
      sync_status: "synced",
    },
    { onConflict: "github_connection_id" }
  );

  return NextResponse.json({ success: true, sha: result.sha });
}
