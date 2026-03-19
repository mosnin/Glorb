import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listingId } = await params;
  const adminSupabase = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();

  // Get listing
  const { data: listing } = await adminSupabase
    .from("marketplace_listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (listing.entity_type === "agent") {
    // Fork agent
    const { data: source } = await adminSupabase
      .from("agents")
      .select("*, agent_files(*)")
      .eq("id", listing.agent_id)
      .single();

    if (!source) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const typedSource = source as {
      name: string;
      description: string;
      configuration: Record<string, unknown>;
      agent_files: { file_name: string; file_path: string; file_type: string; storage_path: string; mime_type: string; size_bytes: number }[];
    };

    // Create new agent
    const { data: newAgent, error: agentError } = await supabase
      .from("agents")
      .insert({
        user_id: userId,
        name: `${typedSource.name} (fork)`,
        description: typedSource.description,
        configuration: typedSource.configuration,
        status: "draft",
      })
      .select()
      .single();

    if (agentError || !newAgent) return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });

    // Copy files
    for (const f of typedSource.agent_files) {
      const { data: blob } = await adminSupabase.storage.from("agent-files").download(f.storage_path);
      if (!blob) continue;

      const newPath = `${userId}/agents/${newAgent.id}/${f.file_path}`;
      await supabase.storage.from("agent-files").upload(newPath, blob, { upsert: true });
      await supabase.from("agent_files").insert({
        agent_id: newAgent.id,
        file_name: f.file_name,
        file_path: f.file_path,
        file_type: f.file_type,
        storage_path: newPath,
        mime_type: f.mime_type,
        size_bytes: f.size_bytes,
      });
    }

    // Increment use count
    await adminSupabase
      .from("marketplace_listings")
      .update({ use_count: (listing.use_count || 0) + 1 })
      .eq("id", listingId);

    return NextResponse.json({ id: newAgent.id, type: "agent" }, { status: 201 });
  }

  // Fork cluster (similar pattern)
  const { data: sourceCluster } = await adminSupabase
    .from("clusters")
    .select("*")
    .eq("id", listing.cluster_id)
    .single();

  if (!sourceCluster) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });

  const { data: newCluster, error: clusterError } = await supabase
    .from("clusters")
    .insert({
      user_id: userId,
      name: `${sourceCluster.name} (fork)`,
      description: sourceCluster.description,
      interaction_map: sourceCluster.interaction_map,
      handoff_definitions: sourceCluster.handoff_definitions,
      status: "draft",
    })
    .select()
    .single();

  if (clusterError || !newCluster) return NextResponse.json({ error: "Failed to create cluster" }, { status: 500 });

  // Increment use count
  await adminSupabase
    .from("marketplace_listings")
    .update({ use_count: (listing.use_count || 0) + 1 })
    .eq("id", listingId);

  return NextResponse.json({ id: newCluster.id, type: "cluster" }, { status: 201 });
}
