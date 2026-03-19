"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Bot,
  Network,
  MessageSquare,
  Activity,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
  FileText,
  FlaskConical,
  Key,
  HeartPulse,
  Shield,
  AlertTriangle,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/components/api-error";

interface FleetHealth {
  summary: { total: number; healthy: number; degraded: number; offline: number; unknown: number };
  agents: {
    agent_id: string;
    agent_name: string;
    status: string;
    error_count_1h: number;
    total_runs_24h: number;
    active_frameworks: string[];
  }[];
}

interface DashboardStats {
  counts: {
    agents: number;
    clusters: number;
    chats: number;
    runs_7d: number;
    success_rate_7d: number | null;
  };
  recentAgents: { id: string; name: string; status: string; updated_at: string }[];
  recentClusters: { id: string; name: string; status: string; updated_at: string }[];
  recentActivity: {
    id: string;
    action: string;
    entity_type: string;
    entity_name: string | null;
    created_at: string;
  }[];
}

const activityIcon = (type: string) => {
  switch (type) {
    case "agent": return <Bot className="h-3.5 w-3.5" />;
    case "cluster": return <Network className="h-3.5 w-3.5" />;
    case "file": return <FileText className="h-3.5 w-3.5" />;
    case "chat": return <MessageSquare className="h-3.5 w-3.5" />;
    case "test": return <FlaskConical className="h-3.5 w-3.5" />;
    case "api_key": return <Key className="h-3.5 w-3.5" />;
    default: return <Activity className="h-3.5 w-3.5" />;
  }
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fleet, setFleet] = useState<FleetHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, fleetRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/agents/health"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      else setError("Failed to load dashboard stats");
      if (fleetRes.ok) setFleet(await fleetRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <ApiError message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Architect and manage your AI agents and clusters.
          </p>
        </div>
        <Button render={<Link href="/chat" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts.agents ?? "..."}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clusters</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts.clusters ?? "..."}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Runs (7d)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts.runs_7d ?? "..."}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.counts.success_rate_7d != null ? `${stats.counts.success_rate_7d}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/chat">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Start Building</CardTitle>
                <CardDescription>
                  Describe what you need and the AI will architect it
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/templates">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Templates</CardTitle>
                <CardDescription>Fork pre-built agents and clusters</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">API & CLI</CardTitle>
                <CardDescription>Manage keys, MCP config, CLI setup</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Fleet Health */}
      {fleet && fleet.agents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              Agent Fleet Health
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              {fleet.summary.healthy > 0 && (
                <span className="flex items-center gap-1 text-green-500">
                  <Shield className="h-3 w-3" /> {fleet.summary.healthy} healthy
                </span>
              )}
              {fleet.summary.degraded > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <AlertTriangle className="h-3 w-3" /> {fleet.summary.degraded} degraded
                </span>
              )}
              {fleet.summary.offline > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <WifiOff className="h-3 w-3" /> {fleet.summary.offline} offline
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {fleet.agents.slice(0, 8).map((agent) => (
                <Link
                  key={agent.agent_id}
                  href={`/agents/${agent.agent_id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agent.status === "healthy"
                          ? "bg-green-500"
                          : agent.status === "degraded"
                            ? "bg-yellow-500"
                            : agent.status === "offline"
                              ? "bg-red-500"
                              : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm font-medium">{agent.agent_name}</span>
                    {agent.active_frameworks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {agent.active_frameworks.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{agent.total_runs_24h} runs</span>
                    {agent.error_count_1h > 0 && (
                      <span className="text-red-500">{agent.error_count_1h} errors</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Agents</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/agents" />}>
              View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!stats?.recentAgents.length ? (
              <p className="text-sm text-muted-foreground">
                No agents yet. Start a chat to create your first agent.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.recentAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{agent.name}</span>
                      <Badge
                        variant={agent.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(agent.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clusters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Clusters</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/clusters" />}>
              View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!stats?.recentClusters.length ? (
              <p className="text-sm text-muted-foreground">
                No clusters yet. Start a chat to create your first cluster.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.recentClusters.map((cluster) => (
                  <Link
                    key={cluster.id}
                    href={`/clusters/${cluster.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{cluster.name}</span>
                      <Badge
                        variant={cluster.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cluster.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(cluster.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentActivity.length ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Your actions will appear here.
              </p>
            ) : (
              <div className="space-y-1">
                {stats.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      {activityIcon(item.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{item.action}</span>
                        {item.entity_name && (
                          <span className="text-muted-foreground"> — {item.entity_name}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
