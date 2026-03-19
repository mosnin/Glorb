import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — List orchestration rules for a cluster
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("cluster_orchestration_rules")
    .select("*, from_agent:agents!cluster_orchestration_rules_from_agent_id_fkey(id, name), to_agent:agents!cluster_orchestration_rules_to_agent_id_fkey(id, name)")
    .eq("cluster_id", clusterId)
    .order("priority", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Create orchestration rule
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
    .from("cluster_orchestration_rules")
    .insert({
      cluster_id: clusterId,
      user_id: userId,
      name: body.name,
      rule_type: body.rule_type,
      from_agent_id: body.from_agent_id || null,
      to_agent_id: body.to_agent_id || null,
      condition_expr: body.condition_expr || null,
      priority: body.priority || 0,
      enabled: true,
    })
    .select("*, from_agent:agents!cluster_orchestration_rules_from_agent_id_fkey(id, name), to_agent:agents!cluster_orchestration_rules_to_agent_id_fkey(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE — Delete orchestration rule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ruleId = searchParams.get("id");
  if (!ruleId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("cluster_orchestration_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ruleId });
}
