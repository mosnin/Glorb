import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — Read memories for this agent
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("agent_memories")
    .select("key, value, updated_at")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST — Write/update memories from an external runtime
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

  // Support single memory or batch
  const memories: { key: string; value: string }[] = Array.isArray(body) ? body : [body];

  if (memories.length === 0 || !memories.every((m) => m.key && m.value !== undefined)) {
    return NextResponse.json({ error: "Each memory requires 'key' and 'value'" }, { status: 400 });
  }

  if (memories.length > 50) {
    return NextResponse.json({ error: "Max 50 memories per request" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const rows = memories.map((m) => ({
    agent_id: agentId,
    user_id: userId,
    key: m.key,
    value: m.value,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("agent_memories")
    .upsert(rows, { onConflict: "agent_id,user_id,key" })
    .select("key, value, updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data?.length || 0, memories: data }, { status: 200 });
}

// DELETE — Remove specific memories
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key query param required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("agent_memories")
    .delete()
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
