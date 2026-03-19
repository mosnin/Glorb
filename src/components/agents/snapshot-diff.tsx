"use client";

import { useEffect, useState } from "react";
import { GitCompare, Plus, Minus, PenLine, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Snapshot {
  id: string;
  version_label: string;
  created_at: string;
}

interface DiffResult {
  from: { id: string; version_label: string; created_at: string };
  to: { id: string; version_label: string; created_at: string };
  metaChanges: { field: string; from: string; to: string }[];
  fileDiffs: {
    fileName: string;
    status: "added" | "removed" | "modified";
    fromContent?: string;
    toContent?: string;
  }[];
  unchangedFileCount: number;
  memoryDiffs: {
    key: string;
    status: "added" | "removed" | "modified";
    fromValue?: string;
    toValue?: string;
  }[];
}

function computeLineDiff(from: string, to: string): { type: "same" | "add" | "remove"; text: string }[] {
  const fromLines = from.split("\n");
  const toLines = to.split("\n");
  const result: { type: "same" | "add" | "remove"; text: string }[] = [];

  const maxLen = Math.max(fromLines.length, toLines.length);
  const toSet = new Set(toLines);
  const fromSet = new Set(fromLines);

  // Simple LCS-like approach: mark removed and added lines
  for (const line of fromLines) {
    if (!toSet.has(line)) {
      result.push({ type: "remove", text: line });
    }
  }
  for (const line of toLines) {
    if (!fromSet.has(line)) {
      result.push({ type: "add", text: line });
    }
  }

  // If no changes found at line level but content differs, show full replacement
  if (result.length === 0 && from !== to) {
    for (const line of fromLines) result.push({ type: "remove", text: line });
    for (const line of toLines) result.push({ type: "add", text: line });
  }

  return result;
}

const STATUS_COLORS = {
  added: "text-green-600 bg-green-500/10",
  removed: "text-red-600 bg-red-500/10",
  modified: "text-yellow-600 bg-yellow-500/10",
};

const STATUS_ICONS = {
  added: Plus,
  removed: Minus,
  modified: PenLine,
};

export function SnapshotDiff({ agentId, open, onOpenChange }: {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    fetch(`/api/agents/${agentId}/snapshots`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSnapshots(list);
        if (list.length >= 2) {
          setFromId(list[1].id);
          setToId(list[0].id);
        }
      });
  }, [agentId, open]);

  async function loadDiff() {
    if (!fromId || !toId) return;
    setLoading(true);
    setDiff(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/snapshots/diff?from=${fromId}&to=${toId}`);
      setDiff(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fromId && toId && open) loadDiff();
  }, [fromId, toId]);

  function toggleFile(fileName: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Snapshot Diff
          </DialogTitle>
        </DialogHeader>

        {snapshots.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Need at least 2 snapshots to compare. Create more snapshots first.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">From</label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.version_label}</option>
                  ))}
                </select>
              </div>
              <span className="text-muted-foreground mt-5">→</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">To</label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>{s.version_label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {diff && !loading && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-2 flex-wrap">
                  {diff.fileDiffs.length > 0 && (
                    <Badge variant="outline">
                      {diff.fileDiffs.length} file{diff.fileDiffs.length !== 1 ? "s" : ""} changed
                    </Badge>
                  )}
                  {diff.unchangedFileCount > 0 && (
                    <Badge variant="secondary">{diff.unchangedFileCount} unchanged</Badge>
                  )}
                  {diff.metaChanges.length > 0 && (
                    <Badge variant="outline">{diff.metaChanges.length} metadata change{diff.metaChanges.length !== 1 ? "s" : ""}</Badge>
                  )}
                  {diff.memoryDiffs.length > 0 && (
                    <Badge variant="outline">{diff.memoryDiffs.length} memory change{diff.memoryDiffs.length !== 1 ? "s" : ""}</Badge>
                  )}
                  {diff.fileDiffs.length === 0 && diff.metaChanges.length === 0 && diff.memoryDiffs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No changes between these snapshots.</p>
                  )}
                </div>

                {/* Metadata changes */}
                {diff.metaChanges.length > 0 && (
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      {diff.metaChanges.map((m) => (
                        <div key={m.field} className="text-xs">
                          <span className="font-medium">{m.field}</span>
                          <div className="mt-1 space-y-0.5">
                            <div className="bg-red-500/5 text-red-700 px-2 py-0.5 rounded font-mono whitespace-pre-wrap">- {m.from}</div>
                            <div className="bg-green-500/5 text-green-700 px-2 py-0.5 rounded font-mono whitespace-pre-wrap">+ {m.to}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* File diffs */}
                {diff.fileDiffs.length > 0 && (
                  <div className="space-y-1.5">
                    {diff.fileDiffs.map((file) => {
                      const Icon = STATUS_ICONS[file.status];
                      const isExpanded = expandedFiles.has(file.fileName);
                      const Chevron = isExpanded ? ChevronDown : ChevronRight;

                      return (
                        <div key={file.fileName} className="border rounded">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                            onClick={() => toggleFile(file.fileName)}
                          >
                            <Chevron className="h-3 w-3 text-muted-foreground" />
                            <Icon className={`h-3 w-3 ${STATUS_COLORS[file.status].split(" ")[0]}`} />
                            <code className="font-mono text-xs flex-1 text-left">{file.fileName}</code>
                            <Badge className={`text-[10px] ${STATUS_COLORS[file.status]}`} variant="outline">
                              {file.status}
                            </Badge>
                          </button>
                          {isExpanded && (
                            <div className="border-t px-3 py-2 max-h-48 overflow-auto">
                              {file.status === "added" && (
                                <pre className="text-[11px] font-mono text-green-700 whitespace-pre-wrap">
                                  {file.toContent?.split("\n").map((l, i) => `+ ${l}`).join("\n")}
                                </pre>
                              )}
                              {file.status === "removed" && (
                                <pre className="text-[11px] font-mono text-red-700 whitespace-pre-wrap">
                                  {file.fromContent?.split("\n").map((l, i) => `- ${l}`).join("\n")}
                                </pre>
                              )}
                              {file.status === "modified" && file.fromContent && file.toContent && (
                                <pre className="text-[11px] font-mono whitespace-pre-wrap">
                                  {computeLineDiff(file.fromContent, file.toContent).map((line, i) => (
                                    <span
                                      key={i}
                                      className={
                                        line.type === "add"
                                          ? "text-green-700 bg-green-500/5"
                                          : line.type === "remove"
                                            ? "text-red-700 bg-red-500/5"
                                            : ""
                                      }
                                    >
                                      {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "} {line.text}{"\n"}
                                    </span>
                                  ))}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Memory diffs */}
                {diff.memoryDiffs.length > 0 && (
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs">Memories</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      {diff.memoryDiffs.map((m) => {
                        const Icon = STATUS_ICONS[m.status];
                        return (
                          <div key={m.key} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <Icon className={`h-3 w-3 ${STATUS_COLORS[m.status].split(" ")[0]}`} />
                              <span className="font-mono font-medium">{m.key}</span>
                            </div>
                            {m.fromValue !== undefined && (
                              <div className="bg-red-500/5 text-red-700 px-2 py-0.5 rounded mt-0.5 font-mono">- {m.fromValue}</div>
                            )}
                            {m.toValue !== undefined && (
                              <div className="bg-green-500/5 text-green-700 px-2 py-0.5 rounded mt-0.5 font-mono">+ {m.toValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
