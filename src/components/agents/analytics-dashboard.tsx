"use client";

import { useEffect, useState } from "react";
import { BarChart3, DollarSign, Zap, TrendingUp, Download, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

export function AnalyticsDashboard({ agentId }: { agentId?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showBudget, setShowBudget] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState("10");
  const [newBudgetThreshold, setNewBudgetThreshold] = useState("80");

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) });
    if (agentId) params.set("agent_id", agentId);

    Promise.all([
      fetch(`/api/analytics?${params}`).then((r) => r.json()),
      fetch("/api/analytics/budgets").then((r) => r.json()),
    ])
      .then(([analytics, budgetData]) => {
        setData(analytics);
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
      })
      .finally(() => setLoading(false));
  }, [agentId, days]);

  async function createBudget() {
    setCreating(true);
    try {
      const res = await fetch("/api/analytics/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId || null,
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
    const rows = data.timeSeries.map((r) => `${r.date},${r.runs},${r.tokens},${r.cost.toFixed(6)},${r.errors}`).join("\n");
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
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const maxRuns = Math.max(...data.timeSeries.map((d) => d.runs), 1);
  const successRate = data.totals.runs > 0
    ? Math.round((data.totals.successes / data.totals.runs) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBudget(true)}>
            <DollarSign className="h-3 w-3 mr-1" />
            Budget
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3 w-3" />
              Total Runs
            </div>
            <p className="text-xl font-bold">{data.totals.runs}</p>
            {successRate !== null && (
              <p className="text-[10px] text-muted-foreground">{successRate}% success</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              Total Tokens
            </div>
            <p className="text-xl font-bold">{formatTokens(data.totals.total_tokens)}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatTokens(data.totals.input_tokens)} in / {formatTokens(data.totals.output_tokens)} out
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Est. Cost
            </div>
            <p className="text-xl font-bold">{formatCost(data.totals.estimated_cost_usd)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              Errors
            </div>
            <p className={`text-xl font-bold ${data.totals.errors > 0 ? "text-red-500" : ""}`}>
              {data.totals.errors}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Run chart (simple bar chart) */}
      {data.timeSeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Runs Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-24">
              {data.timeSeries.map((point) => (
                <div
                  key={point.date}
                  className="flex-1 group relative"
                  title={`${point.date}: ${point.runs} runs, ${formatTokens(point.tokens)} tokens`}
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

      {/* Framework breakdown */}
      {data.byFramework.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Framework</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.byFramework.map((fw) => {
                const pct = data.totals.runs > 0 ? (fw.runs / data.totals.runs) * 100 : 0;
                return (
                  <div key={fw.framework}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
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

      {/* Create Budget Dialog */}
      <Dialog open={showBudget} onOpenChange={setShowBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Token Budget</DialogTitle>
            <DialogDescription>
              {agentId
                ? "Set a monthly spending limit for this agent."
                : "Set a monthly spending limit across all agents."}
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
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Set Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
