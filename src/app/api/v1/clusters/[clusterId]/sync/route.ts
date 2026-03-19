import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — Read cluster-wide activity feed + context docs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all"; // "events", "docs", "all"

  const supabase = createAdminSupabaseClient();

  // Get all agent IDs in this cluster
  const { data: clusterAgents } = await supabase
    .from("cluster_agents")
    .select("agent_id")
    .eq("cluster_id", clusterId);

  const agentIds = clusterAgents?.map((ca) => ca.agent_id) || [];

  const result: { events?: unknown[]; context_docs?: unknown[] } = {};

  if (type === "events" || type === "all") {
    const { data: events } = await supabase
      .from("agent_sync_events")
      .select("*, agent:agents(id, name)")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(100);
    result.events = events || [];
  }

  if (type === "docs" || type === "all") {
    const { data: docs } = await supabase
      .from("cluster_context_docs")
      .select("*")
      .eq("cluster_id", clusterId)
      .order("created_at", { ascending: false });
    result.context_docs = docs || [];
  }

  return NextResponse.json(result);
}

// POST — Add context doc or sync event to cluster
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  // Determine if this is a context doc or sync event
  if (body.doc_type || body.title) {
    // Context doc
    const { data, error } = await supabase
      .from("cluster_context_docs")
      .insert({
        cluster_id: clusterId,
        title: body.title || "Untitled",
        content: body.content || "",
        doc_type: body.doc_type || "shared_context",
        author_agent_id: body.agent_id || null,
        author_framework: body.source_framework || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // Sync event for a specific agent in the cluster
  if (body.agent_id && body.event_type) {
    const { data, error } = await supabase
      .from("agent_sync_events")
      .insert({
        agent_id: body.agent_id,
        user_id: userId,
        source_framework: body.source_framework || "unknown",
        event_type: body.event_type,
        payload: body.payload || {},
        session_id: body.session_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return NextResponse.json({ error: "Provide either a context doc (title+content) or sync event (agent_id+event_type)" }, { status: 400 });
}
