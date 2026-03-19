"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  Zap,
  TrendingUp,
  Download,
  Loader2,
  Plus,
  Trash2,
  Bot,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AnalyticsData {
  totals: {
    runs: number;
    successes: number;
    errors: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
  timeSeries: { date: string; runs: number; tokens: number; cost: number; errors: number }[];
  byFramework: { framework: string; runs: number; tokens: number; cost: number }[];
  byAgent: { agent_id: string; runs: number; tokens: number; cost: number; errors: number }[];
}

interface Budget {
  id: string;
  agent_id: string | null;
  monthly_budget_usd: number;
  alert_threshold_pct: number;
  current_month_usage_usd: number;
  enabled: boolean;
  agent?: { id: string; name: string } | null;
}

interface AlertRule {
  id: string;
  agent_id: string | null;
  condition: string;
  threshold: number;
  notify_via: string;
  enabled: boolean;
  agent?: { id: string; name: string } | null;
}

interface AgentName {
  id: string;
  name: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  "claude-code": "bg-violet-500",
  cursor: "bg-blue-500",
  python: "bg-yellow-500",
  cli: "bg-gray-500",
  web: "bg-green-500",
  api: "bg-orange-500",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [agentNames, setAgentNames] = useState<AgentName[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showBudget, setShowBudget] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState("10");
  const [newBudgetThreshold, setNewBudgetThreshold] = useState("80");

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) });

    Promise.all([
      fetch(`/api/analytics?${params}`).then((r) => r.json()),
      fetch("/api/analytics/budgets").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([analytics, budgetData, alertData, agentsData]) => {
        setData(analytics);
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
        setAlerts(Array.isArray(alertData) ? alertData : []);
        setAgentNames(
          Array.isArray(agentsData)
            ? agentsData.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))
            : []
        );
      })
      .finally(() => setLoading(false));
  }, [days]);

  function getAgentName(agentId: string): string {
    return agentNames.find((a) => a.id === agentId)?.name || agentId.slice(0, 8);
  }

  async function createBudget() {
    setCreating(true);
    try {
      const res = await fetch("/api/analytics/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: null,
          monthly_budget_usd: parseFloat(newBudgetAmount) || 10,
          alert_threshold_pct: parseInt(newBudgetThreshold) || 80,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error); return; }
      setBudgets((prev) => [d, ...prev]);
      setShowBudget(false);
      toast.success("Budget created");
    } finally {
      setCreating(false);
    }
  }

  async function deleteBudget(id: string) {
    await fetch(`/api/analytics/budgets?id=${id}`, { method: "DELETE" });
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    toast.success("Budget deleted");
  }

  function exportCSV() {
    if (!data) return;
    const headers = "Date,Runs,Tokens,Cost,Errors\n";
    const rows = data.timeSeries
      .map((r) => `${r.date},${r.runs},${r.tokens},${r.cost.toFixed(6)},${r.errors}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const maxRuns = Math.max(...(data?.timeSeries.map((d) => d.runs) || [1]), 1);
  const successRate =
    data && data.totals.runs > 0
      ? Math.round((data.totals.successes / data.totals.runs) * 100)
      : null;

  // Sort agents by cost descending for the top spenders table
  const topAgents = [...(data?.byAgent || [])]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Fleet-wide usage, costs, and performance across all agents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBudget(true)}>
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Set Budget
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1.5">
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
            className="text-xs h-7"
          >
            {d}d
          </Button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totals.runs ?? 0}</div>
            {successRate !== null && (
              <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(data?.totals.total_tokens ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(data?.totals.input_tokens ?? 0)} in / {formatTokens(data?.totals.output_tokens ?? 0)} out
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(data?.totals.estimated_cost_usd ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data?.totals.errors ?? 0) > 0 ? "text-red-500" : ""}`}>
              {data?.totals.errors ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run chart */}
      {data && data.timeSeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Runs Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-32">
              {data.timeSeries.map((point) => (
                <div
                  key={point.date}
                  className="flex-1 group relative"
                  title={`${point.date}: ${point.runs} runs, ${formatTokens(point.tokens)} tokens, ${formatCost(point.cost)}`}
                >
                  <div
                    className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-colors hover:bg-primary"
                    style={{ height: `${(point.runs / maxRuns) * 100}%` }}
                  />
                  {point.errors > 0 && (
                    <div
                      className="absolute bottom-0 w-full bg-red-500/60 rounded-t-sm"
                      style={{ height: `${(point.errors / maxRuns) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>{data.timeSeries[0]?.date}</span>
              <span>{data.timeSeries[data.timeSeries.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Agents by Cost */}
        {topAgents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-3.5 w-3.5" />
                Top Agents by Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {topAgents.map((agent, i) => (
                  <Link
                    key={agent.agent_id}
                    href={`/agents/${agent.agent_id}/analytics`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium">{getAgentName(agent.agent_id)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{agent.runs} runs</span>
                      <span>{formatTokens(agent.tokens)} tokens</span>
                      <span className="font-medium text-foreground">{formatCost(agent.cost)}</span>
                      {agent.errors > 0 && (
                        <span className="text-red-500">{agent.errors} err</span>
                      )}
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Framework breakdown */}
        {data && data.byFramework.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byFramework.map((fw) => {
                  const pct = data.totals.runs > 0 ? (fw.runs / data.totals.runs) * 100 : 0;
                  return (
                    <div key={fw.framework}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{fw.framework}</span>
                        <span className="text-muted-foreground">
                          {fw.runs} runs · {formatTokens(fw.tokens)} tokens · {formatCost(fw.cost)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${FRAMEWORK_COLORS[fw.framework] || "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Budgets */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Token Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgets.map((b) => {
                const usagePct = (Number(b.current_month_usage_usd) / Number(b.monthly_budget_usd)) * 100;
                const isWarning = usagePct >= b.alert_threshold_pct;
                return (
                  <div key={b.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-medium">
                          {b.agent?.name || "All Agents"}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCost(Number(b.current_month_usage_usd))} / {formatCost(Number(b.monthly_budget_usd))}
                        </span>
                        {isWarning && <Badge variant="destructive" className="text-[10px]">Over threshold</Badge>}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isWarning ? "bg-red-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(usagePct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteBudget(b.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Active Alert Rules
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{alerts.length} rules</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {alerts.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-2 border rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.agent?.name || "All Agents"}</span>
                    <Badge variant="outline" className="text-[10px]">{rule.condition}</Badge>
                    {rule.condition === "error_rate" && (
                      <span className="text-muted-foreground">threshold: {rule.threshold}%</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">via {rule.notify_via}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Budget Dialog */}
      <Dialog open={showBudget} onOpenChange={setShowBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Token Budget</DialogTitle>
            <DialogDescription>
              Set a monthly spending limit across all agents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Monthly Budget (USD)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alert Threshold (%)</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={newBudgetThreshold}
                onChange={(e) => setNewBudgetThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get alerted when usage reaches this percentage of your budget.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudget(false)}>Cancel</Button>
            <Button onClick={createBudget} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Set Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
