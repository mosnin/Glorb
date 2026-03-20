import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_heartbeats")
    .select("*")
    .eq("agent_id", agentId)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const annotated = (data || []).map((hb) => ({
    ...hb,
    is_alive: now - new Date(hb.last_seen_at).getTime() < 60_000,
    is_stale: now - new Date(hb.last_seen_at).getTime() > 300_000,
  }));

  return NextResponse.json(annotated);
}
