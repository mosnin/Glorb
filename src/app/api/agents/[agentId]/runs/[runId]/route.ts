import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; runId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;
  const supabase = await createServerSupabaseClient();

  // Get run details
  const { data: run, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error || !run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  // Get trace events
  const { data: events } = await supabase
    .from("agent_run_events")
    .select("*")
    .eq("run_id", runId)
    .order("created_at");

  return NextResponse.json({ ...run, events: events || [] });
}
