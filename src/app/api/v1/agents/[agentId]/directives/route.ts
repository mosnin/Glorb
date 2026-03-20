import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — Poll for pending directives (external runtime calls this)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";
  const acknowledge = searchParams.get("acknowledge") === "true";

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("agent_directives")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-acknowledge: mark as "delivered" so they aren't returned again
  if (acknowledge && data && data.length > 0) {
    const ids = data.map((d) => d.id);
    await supabase
      .from("agent_directives")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .in("id", ids);
  }

  return NextResponse.json(data || []);
}

// POST — Create a directive (user sends task to external runtime)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const body = await req.json();

  const { type = "task", message, priority = "normal", metadata = {} } = body;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (!["task", "config_refresh", "pause", "resume", "stop"].includes(type)) {
    return NextResponse.json({
      error: "type must be: task, config_refresh, pause, resume, or stop",
    }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("agent_directives")
    .insert({
      agent_id: agentId,
      user_id: userId,
      type,
      message,
      priority,
      metadata,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
