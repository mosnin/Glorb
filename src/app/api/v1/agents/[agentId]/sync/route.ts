import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";

// GET — Read activity feed for this agent (from all frameworks)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const since = searchParams.get("since"); // ISO timestamp
  const sessionId = searchParams.get("session_id");

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("agent_sync_events")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) query = query.gte("created_at", since);
  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Report activity from an external framework
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();

  // Support single event or batch
  const events = Array.isArray(body) ? body : [body];

  if (events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const rows = events.map((evt: {
    event_type: string;
    source_framework: string;
    payload?: Record<string, unknown>;
    session_id?: string;
  }) => ({
    agent_id: agentId,
    user_id: userId,
    source_framework: evt.source_framework || "unknown",
    event_type: evt.event_type,
    payload: evt.payload || {},
    session_id: evt.session_id || null,
  }));

  const { data, error } = await supabase
    .from("agent_sync_events")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Dispatch webhooks for significant events
  for (const evt of events) {
    if (["run_completed", "run_failed"].includes(evt.event_type)) {
      dispatchWebhook(
        userId,
        evt.event_type === "run_completed" ? "agent.run.completed" : "agent.run.failed",
        { agent_id: agentId, source_framework: evt.source_framework, ...evt.payload }
      ).catch(() => {});
    }
  }

  return NextResponse.json({ inserted: data?.length || 0 }, { status: 201 });
}
