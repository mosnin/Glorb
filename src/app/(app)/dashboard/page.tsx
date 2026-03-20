"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRealtimeMulti } from "@/hooks/use-realtime";
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
  Sparkles,
  Library,
  BarChart3,
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

const statCards = [
  { key: "agents" as const, label: "Agents", icon: Bot, gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-500" },
  { key: "clusters" as const, label: "Clusters", icon: Network, gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-500" },
  { key: "runs_7d" as const, label: "Runs (7d)", icon: Zap, gradient: "from-amber-500/10 to-orange-500/10", iconColor: "text-amber-500" },
] as const;

function OnboardingHero() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/5 via-blue-500/5 to-emerald-500/5 p-4 sm:p-8 animate-fade-in-up">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white animate-float">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Welcome to Glorb</h2>
            <p className="text-sm text-muted-foreground">Your AI agent platform is ready</p>
          </div>
        </div>

        <p className="text-muted-foreground mb-6 max-w-lg">
          Describe what you need in natural language and the AI architect will build agents,
          clusters, and tools for you. Start with one of these:
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/chat" className="group">
            <Card className="h-full border-dashed hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-violet-500/10 p-2 group-hover:bg-violet-500/20 transition-colors">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Start a Chat</p>
                  <p className="text-xs text-muted-foreground">Describe and build</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/templates" className="group">
            <Card className="h-full border-dashed hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-blue-500/10 p-2 group-hover:bg-blue-500/20 transition-colors">
                  <Library className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Use a Template</p>
                  <p className="text-xs text-muted-foreground">Fork pre-built agents</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/marketplace" className="group">
            <Card className="h-full border-dashed hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 group-hover:bg-emerald-500/20 transition-colors">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Marketplace</p>
                  <p className="text-xs text-muted-foreground">Discover community agents</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
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
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        const body = await statsRes.json().catch(() => ({}));
        setError(body.error || `Failed to load dashboard stats (${statsRes.status})`);
      }
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

  // Auto-refresh when data changes via Supabase Realtime
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useRealtimeMulti(
    [
      { table: "agents", event: "*" },
      { table: "agent_health", event: "*" },
      { table: "activity_log", event: "INSERT" },
      { table: "agent_runs", event: "INSERT" },
    ],
    () => {
      // Debounce rapid changes to avoid hammering the API
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadData(), 2000);
    }
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 animate-pulse" />
            <Loader2 className="h-5 w-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
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

  const isEmpty = !stats?.counts.agents && !stats?.counts.clusters && !stats?.recentActivity.length;

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
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

      {/* Onboarding hero for empty state */}
      {isEmpty && <OnboardingHero />}

      {/* Stats Cards — with gradient accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, gradient, iconColor }, i) => (
          <Card key={key} className={`animate-fade-in-up stagger-${i + 1} overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{stats?.counts[key] ?? "—"}</div>
            </CardContent>
          </Card>
        ))}

        <Card className="animate-fade-in-up stagger-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              {stats?.counts.success_rate_7d != null ? (
                <span className={stats.counts.success_rate_7d >= 90 ? "text-emerald-600 dark:text-emerald-400" : stats.counts.success_rate_7d >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                  {stats.counts.success_rate_7d}%
                </span>
              ) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions — only show when not empty */}
      {!isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/chat">
            <Card className="group hover:border-violet-500/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-violet-500/5">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-2 group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-all">
                  <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
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
            <Card className="group hover:border-blue-500/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-blue-500/5">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>Fork pre-built agents and clusters</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="group hover:border-amber-500/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-amber-500/5">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-2 group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-all">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">API & CLI</CardTitle>
                  <CardDescription>Manage keys, MCP config, CLI setup</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}

      {/* Fleet Health — with status indicator bar */}
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
            {/* Health bar */}
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-4 bg-muted">
              {fleet.summary.healthy > 0 && (
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${(fleet.summary.healthy / fleet.summary.total) * 100}%` }}
                />
              )}
              {fleet.summary.degraded > 0 && (
                <div
                  className="bg-yellow-500 transition-all duration-500"
                  style={{ width: `${(fleet.summary.degraded / fleet.summary.total) * 100}%` }}
                />
              )}
              {fleet.summary.offline > 0 && (
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${(fleet.summary.offline / fleet.summary.total) * 100}%` }}
                />
              )}
            </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="rounded-full bg-violet-500/10 p-3">
                  <Bot className="h-5 w-5 text-violet-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  No agents yet. Start a chat to create your first agent.
                </p>
              </div>
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
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <Network className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  No clusters yet. Start a chat to create your first cluster.
                </p>
              </div>
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
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="rounded-full bg-muted p-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No activity yet. Your actions will appear here.
                </p>
              </div>
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
