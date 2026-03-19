import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — List tasks in the queue
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("cluster_task_queue")
    .select("*, assigned_agent:agents!cluster_task_queue_assigned_agent_id_fkey(id, name), source_agent:agents!cluster_task_queue_source_agent_id_fkey(id, name)")
    .eq("cluster_id", clusterId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Enqueue a task
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
    .from("cluster_task_queue")
    .insert({
      cluster_id: clusterId,
      user_id: userId,
      assigned_agent_id: body.assigned_agent_id || null,
      source_agent_id: body.source_agent_id || null,
      rule_id: body.rule_id || null,
      priority: body.priority || 0,
      input_message: body.input_message,
      blocked_by: body.blocked_by || null,
    })
    .select("*, assigned_agent:agents!cluster_task_queue_assigned_agent_id_fkey(id, name), source_agent:agents!cluster_task_queue_source_agent_id_fkey(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
