"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
  DollarSign,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Run {
  id: string;
  status: string;
  input_message: string;
  output_message: string | null;
  trigger_type: string;
  total_turns: number;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface RunEvent {
  id: string;
  event_type: string;
  turn_number: number;
  content: string | null;
  tool_name: string | null;
  tool_input: Record<string, unknown> | null;
  tool_result: string | null;
  created_at: string;
}

interface RunDetail extends Run {
  events: RunEvent[];
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function estimateCost(inputTokens: number, outputTokens: number) {
  // Approximate Claude Sonnet pricing
  const cost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  return cost < 0.01 ? "<$0.01" : `$${cost.toFixed(3)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RunHistory({
  agentId,
  onReplay,
}: {
  agentId: string;
  onReplay?: (message: string) => void;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/runs?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const toggleDetail = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setRunDetail(null);
      return;
    }

    setDetailLoading(true);
    setExpandedRunId(runId);
    try {
      const res = await fetch(`/api/agents/${agentId}/runs/${runId}`);
      if (res.ok) setRunDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const triggerBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      manual: "secondary",
      api: "outline",
      schedule: "default",
      test: "secondary",
    };
    return <Badge variant={variants[type] || "secondary"} className="text-xs">{type}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Run History
            {total > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                ({total} total)
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadRuns}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No runs yet. Run the agent to see execution history here.
          </p>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="border rounded-lg overflow-hidden">
                  {/* Run summary row */}
                  <div
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleDetail(run.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {statusIcon(run.status)}
                        <span className="text-sm truncate max-w-[200px]">
                          {run.input_message}
                        </span>
                        {triggerBadge(run.trigger_type)}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(run.duration_ms)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {(run.input_tokens + run.output_tokens).toLocaleString()} tok
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {estimateCost(run.input_tokens, run.output_tokens)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(run.started_at)}
                        </span>
                        {expandedRunId === run.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    {run.error_message && (
                      <p className="text-xs text-red-500 mt-1">{run.error_message}</p>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {expandedRunId === run.id && (
                    <div className="border-t bg-muted/30 p-3 space-y-3">
                      {detailLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : runDetail ? (
                        <>
                          {/* Stats bar */}
                          <div className="flex gap-4 text-xs flex-wrap">
                            <span>Turns: {runDetail.total_turns}</span>
                            <span>In: {runDetail.input_tokens.toLocaleString()} tokens</span>
                            <span>Out: {runDetail.output_tokens.toLocaleString()} tokens</span>
                            <span>Cost: {estimateCost(runDetail.input_tokens, runDetail.output_tokens)}</span>
                            {runDetail.duration_ms && <span>Duration: {formatDuration(runDetail.duration_ms)}</span>}
                          </div>

                          {/* Full output */}
                          {runDetail.output_message && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                              <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-[200px] whitespace-pre-wrap border">
                                {runDetail.output_message}
                              </pre>
                            </div>
                          )}

                          {/* Trace events */}
                          <div className="space-y-1">
                            {runDetail.events.map((evt) => (
                              <div
                                key={evt.id}
                                className="text-xs border rounded p-2 space-y-1"
                              >
                                <div className="flex items-center gap-2">
                                  {evt.event_type === "tool_use" && (
                                    <Wrench className="h-3 w-3 text-blue-500" />
                                  )}
                                  {evt.event_type === "tool_result" && (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  )}
                                  {evt.event_type === "text" && (
                                    <span className="text-muted-foreground">text</span>
                                  )}
                                  {evt.event_type === "error" && (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <Badge variant="outline" className="text-[10px]">
                                    turn {evt.turn_number}
                                  </Badge>
                                  {evt.tool_name && (
                                    <span className="font-mono text-blue-600">
                                      {evt.tool_name}
                                    </span>
                                  )}
                                </div>
                                {evt.content && (
                                  <pre className="bg-background p-1.5 rounded overflow-auto max-h-[100px] whitespace-pre-wrap">
                                    {evt.content.slice(0, 500)}
                                  </pre>
                                )}
                                {evt.tool_input && (
                                  <pre className="bg-background p-1.5 rounded overflow-auto max-h-[80px] text-[10px]">
                                    {JSON.stringify(evt.tool_input, null, 2)}
                                  </pre>
                                )}
                                {evt.tool_result && (
                                  <pre className="bg-background p-1.5 rounded overflow-auto max-h-[80px] whitespace-pre-wrap">
                                    {evt.tool_result.slice(0, 500)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Replay button */}
                          {onReplay && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReplay(runDetail.input_message)}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              Replay
                            </Button>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
