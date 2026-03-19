"use client";

import { useEffect, useState } from "react";
import { History, Plus, RotateCcw, Eye, Loader2 } from "lucide-react";
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

interface Snapshot {
  id: string;
  version_label: string;
  trigger: string;
  created_at: string;
}

interface SnapshotDetail extends Snapshot {
  snapshot_data: {
    name: string;
    description: string;
    configuration: Record<string, unknown>;
    files: Record<string, { content: string; type: string; path: string }>;
    memories: { key: string; value: string }[];
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  publish: "Publish",
  export: "Export",
  auto: "Auto",
  pre_edit: "Pre-edit",
};

export function SnapshotManager({ agentId, onRollback }: { agentId: string; onRollback?: () => void }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preview, setPreview] = useState<SnapshotDetail | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/snapshots`)
      .then((r) => r.json())
      .then((d) => { setSnapshots(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  async function createSnapshot() {
    setCreating(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_label: newLabel || undefined, trigger: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setSnapshots((prev) => [data, ...prev]);
      setShowCreate(false);
      setNewLabel("");
      toast.success(`Snapshot ${data.version_label} created`);
    } finally {
      setCreating(false);
    }
  }

  async function loadPreview(id: string) {
    setPreviewId(id);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/snapshots/${id}`);
      const data = await res.json();
      setPreview(data);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function rollback() {
    if (!rollbackId) return;
    setRollingBack(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/snapshots/${rollbackId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Rollback failed"); return; }
      toast.success(`Rolled back to ${data.rolled_back_to}`);
      setRollbackId(null);
      onRollback?.();
    } finally {
      setRollingBack(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Version Snapshots
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Snapshot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No snapshots yet.</p>
            <p className="text-xs mt-1">Create a snapshot to save the full agent state for rollback.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between p-2.5 rounded border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium">{snap.version_label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {TRIGGER_LABELS[snap.trigger] || snap.trigger}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(snap.created_at)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => loadPreview(snap.id)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setRollbackId(snap.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create snapshot dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Snapshot</DialogTitle>
              <DialogDescription>
                Save the complete agent state including all files, configuration, and memories.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Version label (e.g., v1.0, pre-refactor)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createSnapshot} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Snapshot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <Dialog open={!!previewId} onOpenChange={() => { setPreviewId(null); setPreview(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Snapshot Preview</DialogTitle>
            </DialogHeader>
            {loadingPreview ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : preview ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{preview.snapshot_data.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Files ({Object.keys(preview.snapshot_data.files).length})</p>
                  <div className="space-y-1 mt-1">
                    {Object.entries(preview.snapshot_data.files).map(([name, file]) => (
                      <div key={name} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted">
                        <code className="font-mono">{file.path}</code>
                        <Badge variant="outline" className="text-[10px] ml-auto">{file.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {preview.snapshot_data.memories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Memories ({preview.snapshot_data.memories.length})</p>
                    <div className="space-y-1 mt-1">
                      {preview.snapshot_data.memories.map((m) => (
                        <div key={m.key} className="text-xs p-1.5 rounded bg-muted">
                          <span className="font-mono font-medium">{m.key}</span>: {m.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>

        {/* Rollback confirmation */}
        <Dialog open={!!rollbackId} onOpenChange={() => setRollbackId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rollback Agent</DialogTitle>
              <DialogDescription>
                This will replace all current files, configuration, and memories with the snapshot version. A new auto-snapshot of the current state will NOT be created — consider creating one first.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRollbackId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={rollback} disabled={rollingBack}>
                {rollingBack ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Rollback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
