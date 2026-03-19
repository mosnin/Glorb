import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — Aggregated analytics for an agent or all agents
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const days = parseInt(searchParams.get("days") || "30");

  const supabase = await createServerSupabaseClient();
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  let query = supabase
    .from("agent_usage_daily")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];

  // Aggregate totals
  const totals = {
    runs: 0,
    successes: 0,
    errors: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
  };

  for (const row of rows) {
    totals.runs += row.run_count;
    totals.successes += row.success_count;
    totals.errors += row.error_count;
    totals.input_tokens += Number(row.input_tokens);
    totals.output_tokens += Number(row.output_tokens);
    totals.total_tokens += Number(row.total_tokens);
    totals.estimated_cost_usd += Number(row.estimated_cost_usd);
  }

  // Group by date for time series
  const byDate = new Map<string, {
    date: string;
    runs: number;
    tokens: number;
    cost: number;
    errors: number;
  }>();

  for (const row of rows) {
    const existing = byDate.get(row.date) || { date: row.date, runs: 0, tokens: 0, cost: 0, errors: 0 };
    existing.runs += row.run_count;
    existing.tokens += Number(row.total_tokens);
    existing.cost += Number(row.estimated_cost_usd);
    existing.errors += row.error_count;
    byDate.set(row.date, existing);
  }

  // Group by framework
  const byFramework = new Map<string, {
    framework: string;
    runs: number;
    tokens: number;
    cost: number;
  }>();

  for (const row of rows) {
    const fw = row.source_framework;
    const existing = byFramework.get(fw) || { framework: fw, runs: 0, tokens: 0, cost: 0 };
    existing.runs += row.run_count;
    existing.tokens += Number(row.total_tokens);
    existing.cost += Number(row.estimated_cost_usd);
    byFramework.set(fw, existing);
  }

  // Group by agent
  const byAgent = new Map<string, {
    agent_id: string;
    runs: number;
    tokens: number;
    cost: number;
    errors: number;
  }>();

  for (const row of rows) {
    const existing = byAgent.get(row.agent_id) || { agent_id: row.agent_id, runs: 0, tokens: 0, cost: 0, errors: 0 };
    existing.runs += row.run_count;
    existing.tokens += Number(row.total_tokens);
    existing.cost += Number(row.estimated_cost_usd);
    existing.errors += row.error_count;
    byAgent.set(row.agent_id, existing);
  }

  return NextResponse.json({
    totals,
    timeSeries: [...byDate.values()],
    byFramework: [...byFramework.values()],
    byAgent: [...byAgent.values()],
  });
}
