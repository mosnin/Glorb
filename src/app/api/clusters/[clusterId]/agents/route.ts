import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("cluster_agents")
    .select("*, agent:agents(*)")
    .eq("cluster_id", clusterId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("cluster_agents")
    .insert({
      cluster_id: clusterId,
      agent_id: body.agent_id,
      role_in_cluster: body.role_in_cluster || null,
    })
    .select("*, agent:agents(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const clusterId = searchParams.get("cluster_id");

  if (!agentId || !clusterId) {
    return NextResponse.json({ error: "agent_id and cluster_id required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("cluster_agents")
    .delete()
    .eq("cluster_id", clusterId)
    .eq("agent_id", agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
