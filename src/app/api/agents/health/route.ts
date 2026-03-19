import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — Fleet health overview for all user's agents
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_health")
    .select("agent_id, status, last_heartbeat, error_count_1h, total_runs_24h, successful_runs_24h, active_frameworks")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also get agent names
  const agentIds = (data || []).map((h) => h.agent_id);
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .in("id", agentIds.length > 0 ? agentIds : ["__none__"]);

  const nameMap = new Map((agents || []).map((a) => [a.id, a.name]));

  const fleet = (data || []).map((h) => ({
    ...h,
    agent_name: nameMap.get(h.agent_id) || "Unknown",
  }));

  const summary = {
    total: fleet.length,
    healthy: fleet.filter((h) => h.status === "healthy").length,
    degraded: fleet.filter((h) => h.status === "degraded").length,
    offline: fleet.filter((h) => h.status === "offline").length,
    unknown: fleet.filter((h) => h.status === "unknown").length,
  };

  return NextResponse.json({ summary, agents: fleet });
}
