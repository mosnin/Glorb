import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCron, getNextRun } from "@/lib/cron";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_schedules")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();

  if (!body.name || !body.cron_expression || !body.input_message) {
    return NextResponse.json({ error: "name, cron_expression, and input_message required" }, { status: 400 });
  }

  // Validate cron
  if (!parseCron(body.cron_expression)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const nextRun = getNextRun(body.cron_expression);

  const { data, error } = await supabase
    .from("agent_schedules")
    .insert({
      agent_id: agentId,
      user_id: userId,
      name: body.name,
      cron_expression: body.cron_expression,
      input_message: body.input_message,
      is_active: true,
      next_run_at: nextRun?.toISOString() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
