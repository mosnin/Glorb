"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Activity, Radio, Filter, RefreshCw, Send, Loader2, Wifi, WifiOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SyncEvent {
  id: string;
  agent_id: string;
  source_framework: string;
  event_type: string;
  payload: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
  agent?: { id: string; name: string };
}

interface Heartbeat {
  id: string;
  source_framework: string;
  session_id: string | null;
  status: string;
  last_seen_at: string;
  is_alive: boolean;
  is_stale: boolean;
  metadata: Record<string, unknown>;
}

interface Directive {
  id: string;
  type: string;
  message: string;
  priority: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown> | null;
}

const EVENT_COLORS: Record<string, string> = {
  run_started: "bg-blue-500",
  run_completed: "bg-green-500",
  run_failed: "bg-red-500",
  tool_called: "bg-purple-500",
  decision_made: "bg-yellow-500",
  output_produced: "bg-cyan-500",
  memory_stored: "bg-indigo-500",
  config_refreshed: "bg-emerald-500",
  error: "bg-red-600",
  heartbeat: "bg-gray-400",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  python: "Python",
  cli: "CLI",
  web: "Web UI",
  unknown: "Unknown",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  delivered: "bg-blue-500",
  in_progress: "bg-purple-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export function SyncDashboard({
  agentId,
  clusterId,
}: {
  agentId?: string;
  clusterId?: string;
}) {
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [directiveMessage, setDirectiveMessage] = useState("");
  const [directiveType, setDirectiveType] = useState<string>("task");
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      let url: string;
      if (clusterId) {
        url = `/api/v1/clusters/${clusterId}/sync?type=events`;
      } else if (agentId) {
        url = `/api/v1/agents/${agentId}/sync?limit=50`;
      } else return;

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      const eventList = Array.isArray(data) ? data : data.events || [];
      setEvents(eventList);
    } catch {
      // Silently fail on polling errors
    } finally {
      setLoading(false);
    }
  }, [agentId, clusterId]);

  const fetchHeartbeats = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/heartbeats`);
      if (res.ok) setHeartbeats(await res.json());
    } catch {}
  }, [agentId]);

  const fetchDirectives = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/directives`);
      if (res.ok) setDirectives(await res.json());
    } catch {}
  }, [agentId]);

  useEffect(() => {
    fetchEvents();
    fetchHeartbeats();
    fetchDirectives();
  }, [fetchEvents, fetchHeartbeats, fetchDirectives]);

  // Live polling
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(() => {
        fetchEvents();
        fetchHeartbeats();
        fetchDirectives();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, fetchEvents, fetchHeartbeats, fetchDirectives]);

  const sendDirective = async () => {
    if (!directiveMessage.trim() || !agentId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/directives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: directiveType,
          message: directiveMessage.trim(),
          priority: "normal",
        }),
      });
      if (res.ok) {
        toast.success("Directive sent");
        setDirectiveMessage("");
        fetchDirectives();
      } else {
        toast.error("Failed to send directive");
      }
    } finally {
      setSending(false);
    }
  };

  // Derive framework summary
  const frameworkSummary = events.reduce<Record<string, string>>((acc, evt) => {
    const fw = evt.source_framework;
    if (!acc[fw] || new Date(evt.created_at) > new Date(acc[fw])) {
      acc[fw] = evt.created_at;
    }
    return acc;
  }, {});

  const filtered = filter
    ? events.filter((e) => e.source_framework === filter)
    : events;

  const uniqueFrameworks = [...new Set(events.map((e) => e.source_framework))];
  const aliveHeartbeats = heartbeats.filter((h) => h.is_alive);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Cross-Framework Activity
            {aliveHeartbeats.length > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Wifi className="h-2.5 w-2.5 text-green-500" />
                {aliveHeartbeats.length} runtime{aliveHeartbeats.length !== 1 ? "s" : ""} connected
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={live ? "default" : "outline"}
              onClick={() => setLive(!live)}
            >
              <Radio className={`h-3 w-3 mr-1 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Paused"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { fetchEvents(); fetchHeartbeats(); fetchDirectives(); }}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected runtimes (heartbeats) */}
        {heartbeats.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Connected Runtimes
            </h3>
            <div className="flex flex-wrap gap-2">
              {heartbeats.map((hb) => (
                <div
                  key={hb.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                >
                  {hb.is_alive ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className={`h-3 w-3 ${hb.is_stale ? "text-red-400" : "text-yellow-500"}`} />
                  )}
                  <span className="font-medium">
                    {FRAMEWORK_LABELS[hb.source_framework] || hb.source_framework}
                  </span>
                  <span className="text-muted-foreground">
                    {hb.status} · {timeAgo(hb.last_seen_at)}
                  </span>
                  {hb.session_id && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {hb.session_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Framework status (from events) — only show if no heartbeats */}
        {heartbeats.length === 0 && Object.keys(frameworkSummary).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(frameworkSummary).map(([fw, lastSeen]) => (
              <div
                key={fw}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    Date.now() - new Date(lastSeen).getTime() < 300000
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
                <span className="font-medium">
                  {FRAMEWORK_LABELS[fw] || fw}
                </span>
                <span className="text-muted-foreground">{timeAgo(lastSeen)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Send directive */}
        {agentId && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Send Directive
            </h3>
            <div className="flex gap-2">
              <select
                value={directiveType}
                onChange={(e) => setDirectiveType(e.target.value)}
                className="text-xs border rounded px-2 py-1.5 bg-background w-28"
              >
                <option value="task">Task</option>
                <option value="config_refresh">Refresh Config</option>
                <option value="pause">Pause</option>
                <option value="resume">Resume</option>
                <option value="stop">Stop</option>
              </select>
              <Input
                value={directiveMessage}
                onChange={(e) => setDirectiveMessage(e.target.value)}
                placeholder="Send a task or instruction to external runtimes..."
                className="text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && sendDirective()}
              />
              <Button size="sm" onClick={sendDirective} disabled={sending || !directiveMessage.trim()}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {/* Recent directives */}
        {directives.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Directives
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {directives.slice(0, 10).map((d) => (
                <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[d.status] || "bg-gray-400"}`} />
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{d.type}</Badge>
                  <span className="truncate flex-1">{d.message}</span>
                  <span className="text-muted-foreground shrink-0">{d.status}</span>
                  <span className="text-muted-foreground shrink-0">{timeAgo(d.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter bar */}
        {uniqueFrameworks.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Button
              size="sm"
              variant={filter === null ? "default" : "outline"}
              onClick={() => setFilter(null)}
              className="h-6 text-xs"
            >
              All
            </Button>
            {uniqueFrameworks.map((fw) => (
              <Button
                key={fw}
                size="sm"
                variant={filter === fw ? "default" : "outline"}
                onClick={() => setFilter(fw)}
                className="h-6 text-xs"
              >
                {FRAMEWORK_LABELS[fw] || fw}
              </Button>
            ))}
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Loading activity...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No activity yet. Run this agent from any framework to see events here.
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted text-sm"
              >
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${EVENT_COLORS[evt.event_type] || "bg-gray-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {evt.agent?.name && (
                      <span className="font-medium text-xs">{evt.agent.name}</span>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {FRAMEWORK_LABELS[evt.source_framework] || evt.source_framework}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {evt.event_type}
                    </span>
                  </div>
                  {evt.payload && Object.keys(evt.payload).length > 0 && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {evt.payload.message as string ||
                        evt.payload.tool as string ||
                        JSON.stringify(evt.payload).slice(0, 80)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(evt.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
