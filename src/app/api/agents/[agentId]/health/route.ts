import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — Get or compute agent health status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = createAdminSupabaseClient();

  // Compute health from recent sync events
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const fiveMinAgo = new Date(Date.now() - 300000).toISOString();

  // Get recent events
  const { data: recentEvents } = await supabase
    .from("agent_sync_events")
    .select("event_type, source_framework, created_at, payload")
    .eq("agent_id", agentId)
    .gte("created_at", oneDayAgo)
    .order("created_at", { ascending: false });

  const events = recentEvents || [];

  // Derive health metrics
  const lastEvent = events[0];
  const lastHeartbeat = events.find(
    (e) => e.event_type === "heartbeat" || e.event_type === "run_completed"
  );
  const lastError = events.find(
    (e) => e.event_type === "run_failed" || e.event_type === "error"
  );

  const errorsLastHour = events.filter(
    (e) =>
      (e.event_type === "run_failed" || e.event_type === "error") &&
      e.created_at >= oneHourAgo
  ).length;

  const runs24h = events.filter(
    (e) => e.event_type === "run_completed" || e.event_type === "run_failed"
  );
  const successfulRuns = runs24h.filter((e) => e.event_type === "run_completed").length;

  const activeFrameworks = [...new Set(
    events
      .filter((e) => e.created_at >= fiveMinAgo)
      .map((e) => e.source_framework)
  )];

  // Determine status
  let status: "healthy" | "degraded" | "offline" | "unknown" = "unknown";
  if (events.length === 0) {
    status = "unknown";
  } else if (lastHeartbeat && lastHeartbeat.created_at >= fiveMinAgo) {
    status = errorsLastHour > 3 ? "degraded" : "healthy";
  } else if (lastEvent && lastEvent.created_at >= fiveMinAgo) {
    status = errorsLastHour > 3 ? "degraded" : "healthy";
  } else if (lastEvent) {
    const lastTime = new Date(lastEvent.created_at).getTime();
    const ageMinutes = (Date.now() - lastTime) / 60000;
    if (ageMinutes < 30) {
      status = errorsLastHour > 3 ? "degraded" : "healthy";
    } else {
      status = "offline";
    }
  }

  // Upsert health record
  const healthData = {
    agent_id: agentId,
    user_id: userId,
    status,
    last_heartbeat: lastHeartbeat?.created_at || null,
    last_error: lastError?.created_at || null,
    last_error_message: lastError?.payload?.message as string || null,
    error_count_1h: errorsLastHour,
    total_runs_24h: runs24h.length,
    successful_runs_24h: successfulRuns,
    active_frameworks: activeFrameworks,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("agent_health")
    .upsert(healthData, { onConflict: "agent_id" });

  return NextResponse.json(healthData);
}
