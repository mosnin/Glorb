import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();

    // Fetch agents list first (needed for run stats sub-query)
    const { data: userAgents, error: agentsErr } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId);

    if (agentsErr) {
      return NextResponse.json({ error: `Supabase error: ${agentsErr.message}` }, { status: 500 });
    }

    const agentIds = (userAgents || []).map((a) => a.id);

    // Fetch counts and recent items in parallel
    const [
      { count: agentCount },
      { count: clusterCount },
      { count: chatCount },
      { data: recentAgents },
      { data: recentClusters },
      { data: recentActivity },
      { data: runStats },
    ] = await Promise.all([
      supabase.from("agents").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("clusters").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("chat_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("agents")
        .select("id, name, status, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("clusters")
        .select("id, name, status, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      agentIds.length > 0
        ? supabase
            .from("agent_run_stats")
            .select("*")
            .in("agent_id", agentIds)
            .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
            .order("date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Aggregate run stats
    const totalRuns = runStats?.reduce((sum, s) => sum + (s.run_count || 0), 0) || 0;
    const totalSuccesses = runStats?.reduce((sum, s) => sum + (s.success_count || 0), 0) || 0;

    return NextResponse.json({
      counts: {
        agents: agentCount || 0,
        clusters: clusterCount || 0,
        chats: chatCount || 0,
        runs_7d: totalRuns,
        success_rate_7d: totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : null,
      },
      recentAgents: recentAgents || [],
      recentClusters: recentClusters || [],
      recentActivity: recentActivity || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
