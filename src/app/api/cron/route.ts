import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runAgent } from "@/lib/ai/agent-runtime";
import { getNextRun } from "@/lib/cron";
import { processRunCompletion } from "@/lib/pipeline";
import { dispatchWebhook } from "@/lib/webhooks";

/**
 * Scheduled run executor. Call this endpoint on a regular interval
 * (e.g. every minute via Vercel Cron or an external cron service).
 *
 * GET /api/cron?key=CRON_SECRET
 *
 * It finds all active schedules whose next_run_at is in the past,
 * executes the agent run, records the result, and advances next_run_at.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized invocations
  const cronSecret = process.env.CRON_SECRET;
  const providedKey = req.nextUrl.searchParams.get("key");

  if (cronSecret && providedKey !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  // Find all due schedules
  const { data: dueSchedules, error } = await supabase
    .from("agent_schedules")
    .select("*, agent:agents(id, name, user_id)")
    .eq("is_active", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(10); // Process at most 10 per invocation to avoid timeouts

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return NextResponse.json({ executed: 0 });
  }

  const results: { schedule_id: string; agent_id: string; status: string }[] = [];

  for (const schedule of dueSchedules) {
    const agent = schedule.agent as { id: string; name: string; user_id: string } | null;
    if (!agent) {
      // Agent was deleted — deactivate the schedule
      await supabase
        .from("agent_schedules")
        .update({ is_active: false })
        .eq("id", schedule.id);
      continue;
    }

    const startTime = Date.now();
    const userId = agent.user_id;

    // Create run record
    const { data: run } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: agent.id,
        user_id: userId,
        status: "running",
        input_message: schedule.input_message,
        trigger_type: "schedule",
      })
      .select()
      .single();

    // Dispatch webhook
    dispatchWebhook(userId, "agent.run.started", {
      agent_id: agent.id,
      run_id: run?.id,
      trigger: "schedule",
      schedule_id: schedule.id,
    }).catch(() => {});

    let fullResponse = "";
    let hasError = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      for await (const event of runAgent({
        agentId: agent.id,
        userMessage: schedule.input_message,
        userId,
      })) {
        if (event.type === "text" && event.content) fullResponse += event.content;
        if (event.type === "error") hasError = true;
        if (event.type === "done" && event.usage) {
          totalInputTokens += event.usage.input_tokens;
          totalOutputTokens += event.usage.output_tokens;
        }
      }
    } catch (err) {
      hasError = true;
      fullResponse = err instanceof Error ? err.message : "Unknown error";
    }

    const durationMs = Date.now() - startTime;
    const runStatus = hasError ? "failed" : "completed";

    // Update run record
    if (run) {
      await supabase
        .from("agent_runs")
        .update({
          status: runStatus,
          output_message: fullResponse.slice(0, 50000),
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          duration_ms: durationMs,
          error_message: hasError ? fullResponse.slice(0, 1000) : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    // Pipeline: roll up usage, health, alerts
    processRunCompletion({
      agentId: agent.id,
      userId,
      status: runStatus,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      durationMs,
      sourceFramework: "schedule",
    }).catch(() => {});

    // Dispatch completion webhook
    dispatchWebhook(
      userId,
      hasError ? "agent.run.failed" : "agent.run.completed",
      {
        agent_id: agent.id,
        run_id: run?.id,
        trigger: "schedule",
        schedule_id: schedule.id,
        duration_ms: durationMs,
      }
    ).catch(() => {});

    // Advance next_run_at
    const nextRun = getNextRun(schedule.cron_expression);
    await supabase
      .from("agent_schedules")
      .update({
        last_run_at: now,
        next_run_at: nextRun?.toISOString() || null,
      })
      .eq("id", schedule.id);

    results.push({
      schedule_id: schedule.id,
      agent_id: agent.id,
      status: runStatus,
    });
  }

  return NextResponse.json({ executed: results.length, results });
}
