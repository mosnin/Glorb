import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const { from_agent_id, to_agent_id, condition, description } = await req.json();

  if (!from_agent_id || !to_agent_id || !condition) {
    return NextResponse.json({ error: "from_agent_id, to_agent_id, and condition are required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: cluster } = await supabase
    .from("clusters")
    .select("handoff_definitions, interaction_map")
    .eq("id", clusterId)
    .single();

  if (!cluster) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });

  const handoffs = [...(cluster.handoff_definitions || [])];
  handoffs.push({ from_agent_id, to_agent_id, condition, description });

  const map = { ...(cluster.interaction_map || {}) } as Record<string, string[]>;
  if (!map[from_agent_id]) map[from_agent_id] = [];
  if (!map[from_agent_id].includes(to_agent_id)) map[from_agent_id].push(to_agent_id);

  const { error } = await supabase
    .from("clusters")
    .update({ handoff_definitions: handoffs, interaction_map: map, updated_at: new Date().toISOString() })
    .eq("id", clusterId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, handoffs });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const { searchParams } = new URL(req.url);
  const index = parseInt(searchParams.get("index") || "-1");

  if (index < 0) return NextResponse.json({ error: "index required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { data: cluster } = await supabase
    .from("clusters")
    .select("handoff_definitions")
    .eq("id", clusterId)
    .single();

  if (!cluster) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });

  const handoffs = [...(cluster.handoff_definitions || [])];
  handoffs.splice(index, 1);

  const { error } = await supabase
    .from("clusters")
    .update({ handoff_definitions: handoffs, updated_at: new Date().toISOString() })
    .eq("id", clusterId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
