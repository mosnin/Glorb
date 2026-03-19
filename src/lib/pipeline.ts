import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";

/**
 * Post-run pipeline: rolls up usage into agent_usage_daily,
 * recalculates agent_health, and evaluates alert rules.
 *
 * Called fire-and-forget after a run completes.
 */
export async function processRunCompletion(opts: {
  agentId: string;
  userId: string;
  status: "completed" | "failed";
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  sourceFramework?: string;
}) {
  const {
    agentId,
    userId,
    status,
    inputTokens,
    outputTokens,
    durationMs,
    sourceFramework = "web",
  } = opts;

  const supabase = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const totalTokens = inputTokens + outputTokens;

  // Rough cost estimate (per 1M tokens, blended)
  const estimatedCost =
    (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

  // --- 1. Upsert agent_usage_daily ---
  const { data: existing } = await supabase
    .from("agent_usage_daily")
    .select("id, run_count, success_count, error_count, input_tokens, output_tokens, total_tokens, estimated_cost_usd, total_duration_ms")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .eq("date", today)
    .eq("source_framework", sourceFramework)
    .maybeSingle();

  if (existing) {
    const newRunCount = existing.run_count + 1;
    await supabase
      .from("agent_usage_daily")
      .update({
        run_count: newRunCount,
        success_count: existing.success_count + (status === "completed" ? 1 : 0),
        error_count: existing.error_count + (status === "failed" ? 1 : 0),
        input_tokens: Number(existing.input_tokens) + inputTokens,
        output_tokens: Number(existing.output_tokens) + outputTokens,
        total_tokens: Number(existing.total_tokens) + totalTokens,
        estimated_cost_usd: Number(existing.estimated_cost_usd) + estimatedCost,
        total_duration_ms: Number(existing.total_duration_ms) + durationMs,
        avg_latency_ms: Math.round(
          (Number(existing.total_duration_ms) + durationMs) / newRunCount
        ),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("agent_usage_daily").insert({
      agent_id: agentId,
      user_id: userId,
      date: today,
      source_framework: sourceFramework,
      run_count: 1,
      success_count: status === "completed" ? 1 : 0,
      error_count: status === "failed" ? 1 : 0,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
      total_duration_ms: durationMs,
      avg_latency_ms: durationMs,
    });
  }

  // --- 2. Recalculate agent_health ---
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();

  // Use agent_runs as the source of truth (not just sync_events)
  const { data: recentRuns } = await supabase
    .from("agent_runs")
    .select("status, created_at, error_message")
    .eq("agent_id", agentId)
    .gte("created_at", oneDayAgo)
    .order("created_at", { ascending: false });

  const runs = recentRuns || [];
  const errorsLastHour = runs.filter(
    (r) => r.status === "failed" && r.created_at >= oneHourAgo
  ).length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const lastError = runs.find((r) => r.status === "failed");
  const lastRun = runs[0];

  let healthStatus: "healthy" | "degraded" | "offline" | "unknown" = "unknown";
  if (runs.length === 0) {
    healthStatus = "unknown";
  } else if (lastRun && lastRun.created_at >= fiveMinAgo) {
    healthStatus = errorsLastHour > 3 ? "degraded" : "healthy";
  } else if (lastRun) {
    const ageMinutes =
      (Date.now() - new Date(lastRun.created_at).getTime()) / 60_000;
    healthStatus =
      ageMinutes < 30
        ? errorsLastHour > 3
          ? "degraded"
          : "healthy"
        : "offline";
  }

  await supabase.from("agent_health").upsert(
    {
      agent_id: agentId,
      user_id: userId,
      status: healthStatus,
      last_heartbeat: new Date().toISOString(),
      last_error: lastError?.created_at || null,
      last_error_message: lastError?.error_message || null,
      error_count_1h: errorsLastHour,
      total_runs_24h: runs.length,
      successful_runs_24h: completedRuns,
      active_frameworks: [sourceFramework],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" }
  );

  // --- 3. Evaluate alert rules ---
  const { data: alertRules } = await supabase
    .from("agent_alert_rules")
    .select("*")
    .eq("enabled", true)
    .or(`agent_id.eq.${agentId},agent_id.is.null`)
    .eq("user_id", userId);

  for (const rule of alertRules || []) {
    let shouldFire = false;

    switch (rule.condition) {
      case "run_failed":
        shouldFire = status === "failed";
        break;
      case "error_rate":
        if (runs.length >= 5) {
          const errorRate = errorsLastHour / runs.length;
          shouldFire = errorRate >= (rule.threshold / 100);
        }
        break;
      case "offline":
        shouldFire = healthStatus === "offline";
        break;
      case "degraded":
        shouldFire = healthStatus === "degraded";
        break;
    }

    if (!shouldFire) continue;

    // Get agent name for alert message
    const { data: agent } = await supabase
      .from("agents")
      .select("name")
      .eq("id", agentId)
      .single();

    const alertPayload = {
      rule_id: rule.id,
      agent_id: agentId,
      agent_name: agent?.name || agentId,
      condition: rule.condition,
      health_status: healthStatus,
      errors_1h: errorsLastHour,
    };

    if (rule.notify_via === "webhook" && rule.webhook_url) {
      // Direct webhook to user's alert URL
      fetch(rule.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "alert.fired",
          timestamp: new Date().toISOString(),
          data: alertPayload,
        }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
    }

    // Also dispatch through the webhook system
    dispatchWebhook(userId, "agent.run.failed", alertPayload).catch(() => {});
  }

  // --- 4. Update token budget usage ---
  const { data: budgets } = await supabase
    .from("agent_token_budgets")
    .select("id, current_month_usage_usd, monthly_budget_usd, alert_threshold_pct")
    .eq("enabled", true)
    .eq("user_id", userId)
    .or(`agent_id.eq.${agentId},agent_id.is.null`);

  for (const budget of budgets || []) {
    const newUsage = Number(budget.current_month_usage_usd) + estimatedCost;
    await supabase
      .from("agent_token_budgets")
      .update({ current_month_usage_usd: newUsage })
      .eq("id", budget.id);
  }
}

// Cooldown cache: prevents duplicate pre_edit snapshots within 5 minutes
const snapshotCooldowns = new Map<string, number>();
const SNAPSHOT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates an auto-snapshot of an agent (for publish/export/pre_edit triggers).
 * Runs fire-and-forget — failures are silently ignored.
 *
 * For pre_edit triggers, enforces a 5-minute cooldown per agent to prevent
 * rapid successive edits from flooding the snapshots table.
 */
export async function createAutoSnapshot(opts: {
  agentId: string;
  userId: string;
  trigger: "publish" | "export" | "pre_edit" | "auto";
}) {
  const { agentId, userId, trigger } = opts;

  // Enforce cooldown for pre_edit snapshots
  if (trigger === "pre_edit") {
    const cooldownKey = `${agentId}:pre_edit`;
    const lastSnapshot = snapshotCooldowns.get(cooldownKey);
    if (lastSnapshot && Date.now() - lastSnapshot < SNAPSHOT_COOLDOWN_MS) {
      return; // Skip — too recent
    }
    snapshotCooldowns.set(cooldownKey, Date.now());

    // Prevent unbounded memory growth
    if (snapshotCooldowns.size > 1000) {
      const cutoff = Date.now() - SNAPSHOT_COOLDOWN_MS;
      for (const [key, time] of snapshotCooldowns) {
        if (time < cutoff) snapshotCooldowns.delete(key);
      }
    }
  }

  const supabase = createAdminSupabaseClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("*, agent_files(*)")
    .eq("id", agentId)
    .single();

  if (!agent) return;

  // Load file contents
  const files: Record<string, { content: string; type: string; path: string }> = {};
  for (const file of agent.agent_files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storage_path);
    files[file.file_name] = {
      content: blob ? await blob.text() : "",
      type: file.file_type,
      path: file.file_path,
    };
  }

  const { data: memories } = await supabase
    .from("agent_memories")
    .select("key, value")
    .eq("agent_id", agentId);

  const snapshotData = {
    name: agent.name,
    description: agent.description,
    status: agent.status,
    configuration: agent.configuration,
    files,
    memories: memories || [],
  };

  const { count } = await supabase
    .from("agent_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  const label = `v${(count || 0) + 1}-${trigger}`;

  await supabase.from("agent_snapshots").insert({
    agent_id: agentId,
    user_id: userId,
    version_label: label,
    trigger,
    snapshot_data: snapshotData,
  });
}
