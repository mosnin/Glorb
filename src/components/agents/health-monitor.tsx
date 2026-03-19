"use client";

import { useEffect, useState, useCallback } from "react";
import { HeartPulse, Shield, AlertTriangle, WifiOff, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HealthData {
  agent_id: string;
  status: "healthy" | "degraded" | "offline" | "unknown";
  last_heartbeat: string | null;
  last_error: string | null;
  last_error_message: string | null;
  error_count_1h: number;
  total_runs_24h: number;
  successful_runs_24h: number;
  active_frameworks: string[];
}

const STATUS_CONFIG = {
  healthy: { icon: Shield, color: "text-green-500", bg: "bg-green-500/10", label: "Healthy" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Degraded" },
  offline: { icon: WifiOff, color: "text-red-500", bg: "bg-red-500/10", label: "Offline" },
  unknown: { icon: HelpCircle, color: "text-gray-400", bg: "bg-gray-400/10", label: "Unknown" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function HealthMonitor({ agentId }: { agentId: string }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/health`);
      if (res.ok) setHealth(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading health data...</p>
        </CardContent>
      </Card>
    );
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;
  const successRate = health.total_runs_24h > 0
    ? Math.round((health.successful_runs_24h / health.total_runs_24h) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            Health
          </CardTitle>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Runs (24h)</p>
            <p className="text-lg font-bold">{health.total_runs_24h}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-lg font-bold">
              {successRate !== null ? `${successRate}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Errors (1h)</p>
            <p className={`text-lg font-bold ${health.error_count_1h > 0 ? "text-red-500" : ""}`}>
              {health.error_count_1h}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Active</p>
            <p className="text-sm font-medium">{timeAgo(health.last_heartbeat)}</p>
          </div>
        </div>

        {health.active_frameworks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1.5">Active Frameworks</p>
            <div className="flex flex-wrap gap-1.5">
              {health.active_frameworks.map((fw) => (
                <Badge key={fw} variant="outline" className="text-[10px]">
                  {fw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {health.last_error_message && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Last Error ({timeAgo(health.last_error)})</p>
            <p className="text-xs text-red-500 bg-red-500/5 p-2 rounded">{health.last_error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
