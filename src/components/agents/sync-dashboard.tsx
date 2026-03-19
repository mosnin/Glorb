"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Activity, Radio, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const EVENT_COLORS: Record<string, string> = {
  run_started: "bg-blue-500",
  run_completed: "bg-green-500",
  run_failed: "bg-red-500",
  tool_called: "bg-purple-500",
  decision_made: "bg-yellow-500",
  output_produced: "bg-cyan-500",
  memory_stored: "bg-indigo-500",
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

export function SyncDashboard({
  agentId,
  clusterId,
}: {
  agentId?: string;
  clusterId?: string;
}) {
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [live, setLive] = useState(true);
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

      // Cluster endpoint returns { events: [...] }, agent returns array directly
      const eventList = Array.isArray(data) ? data : data.events || [];
      setEvents(eventList);
    } catch {
      // Silently fail on polling errors
    } finally {
      setLoading(false);
    }
  }, [agentId, clusterId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Live polling
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(fetchEvents, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, fetchEvents]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Cross-Framework Activity
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
            <Button size="sm" variant="ghost" onClick={fetchEvents}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Framework status strip */}
        {Object.keys(frameworkSummary).length > 0 && (
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
