import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// POST — Register/update heartbeat from external runtime
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const body = await req.json().catch(() => ({}));

  const {
    source_framework = "unknown",
    session_id = null,
    status = "running",
    metadata = {},
  } = body;

  const supabase = createAdminSupabaseClient();

  // Upsert heartbeat record — one per agent+framework+session
  const { data, error } = await supabase
    .from("agent_heartbeats")
    .upsert(
      {
        agent_id: agentId,
        user_id: userId,
        source_framework,
        session_id,
        status,
        metadata,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,source_framework,session_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check for pending directives and return them
  const { data: directives } = await supabase
    .from("agent_directives")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  // Check if manifest has changed since last pull
  const { data: agent } = await supabase
    .from("agents")
    .select("updated_at")
    .eq("id", agentId)
    .single();

  return NextResponse.json({
    heartbeat: data,
    directives: directives || [],
    config_updated_at: agent?.updated_at || null,
  });
}

// GET — List active heartbeats for an agent
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;

  const { agentId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("agent_heartbeats")
    .select("*")
    .eq("agent_id", agentId)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Annotate with alive/stale status
  const now = Date.now();
  const annotated = (data || []).map((hb) => ({
    ...hb,
    is_alive: now - new Date(hb.last_seen_at).getTime() < 60_000, // alive if seen in last 60s
    is_stale: now - new Date(hb.last_seen_at).getTime() > 300_000, // stale after 5 min
  }));

  return NextResponse.json(annotated);
}
