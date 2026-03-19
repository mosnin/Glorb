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
    .from("clusters")
    .select("*, cluster_agents(*, agent:agents(*)), cluster_files(*)")
    .eq("id", clusterId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.manager_agent_id !== undefined) updateData.manager_agent_id = body.manager_agent_id;
  if (body.interaction_map !== undefined) updateData.interaction_map = body.interaction_map;
  if (body.handoff_definitions !== undefined) updateData.handoff_definitions = body.handoff_definitions;

  const { data, error } = await supabase
    .from("clusters")
    .update(updateData)
    .eq("id", clusterId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("clusters").delete().eq("id", clusterId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
