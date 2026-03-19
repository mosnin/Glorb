import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  // Load source cluster
  const { data: cluster, error } = await supabase
    .from("clusters")
    .select("*, cluster_agents(*), cluster_files(*)")
    .eq("id", clusterId)
    .single();

  if (error || !cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  // Create cloned cluster
  const { data: cloned, error: cloneError } = await supabase
    .from("clusters")
    .insert({
      user_id: userId,
      name: `${cluster.name} (Copy)`,
      description: cluster.description,
      status: "draft",
      manager_agent_id: cluster.manager_agent_id,
      interaction_map: cluster.interaction_map,
      handoff_definitions: cluster.handoff_definitions,
    })
    .select()
    .single();

  if (cloneError || !cloned) {
    return NextResponse.json({ error: "Failed to clone cluster" }, { status: 500 });
  }

  // Clone cluster_agents associations
  for (const ca of cluster.cluster_agents || []) {
    await adminSupabase.from("cluster_agents").insert({
      cluster_id: cloned.id,
      agent_id: ca.agent_id,
      role_in_cluster: ca.role_in_cluster,
    });
  }

  // Clone cluster files
  for (const file of cluster.cluster_files || []) {
    if (file.storage_path) {
      const { data: blob } = await adminSupabase.storage
        .from("agent-files")
        .download(file.storage_path);

      if (blob) {
        const newPath = `${userId}/clusters/${cloned.id}/${file.file_path}`;
        await adminSupabase.storage
          .from("agent-files")
          .upload(newPath, blob, { contentType: "text/plain" });

        await adminSupabase.from("cluster_files").insert({
          cluster_id: cloned.id,
          file_name: file.file_name,
          file_path: file.file_path,
          file_type: file.file_type,
          storage_path: newPath,
          size_bytes: file.size_bytes,
        });
      }
    }
  }

  return NextResponse.json({ id: cloned.id, name: cloned.name }, { status: 201 });
}
