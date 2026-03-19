"use client";

import { useState, useEffect, useCallback } from "react";
import { History, RotateCcw, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Version {
  id: string;
  version_number: number;
  change_source: string;
  change_summary: string | null;
  size_bytes: number;
  created_at: string;
  content?: string;
}

interface VersionHistoryPanelProps {
  agentId: string;
  fileId: string;
  fileName: string;
  onRollback?: () => void;
}

export function VersionHistoryPanel({
  agentId,
  fileId,
  fileName,
  onRollback,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/files/${fileId}/versions`);
      if (res.ok) setVersions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId, fileId]);

  const previewVersion = async (versionId: string) => {
    if (expandedId === versionId) {
      setExpandedId(null);
      setPreviewContent(null);
      return;
    }
    const res = await fetch(`/api/agents/${agentId}/files/${fileId}/versions/${versionId}`);
    if (res.ok) {
      const data = await res.json();
      setPreviewContent(data.content);
      setExpandedId(versionId);
    }
  };

  const rollback = async (versionId: string, versionNumber: number) => {
    setRollingBack(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/files/${fileId}/versions/${versionId}`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(`Rolled back to version ${versionNumber}`);
        loadVersions();
        onRollback?.();
      } else {
        toast.error("Rollback failed");
      }
    } finally {
      setRollingBack(false);
    }
  };

  const createSnapshot = async () => {
    const res = await fetch(`/api/agents/${agentId}/files/${fileId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change_source: "manual", change_summary: "Manual snapshot" }),
    });
    if (res.ok) {
      toast.success("Snapshot created");
      loadVersions();
    }
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case "ai_chat": return "default";
      case "manual": return "secondary";
      case "api": return "outline";
      default: return "secondary";
    }
  };

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="sm" onClick={loadVersions} />}
      >
        <History className="h-3.5 w-3.5 mr-1.5" />
        History
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </SheetTitle>
          <p className="text-sm text-muted-foreground font-mono">{fileName}</p>
        </SheetHeader>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={createSnapshot}>
            Create Snapshot
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No versions yet. Versions are created automatically when files are saved.
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">v{v.version_number}</span>
                      <Badge variant={sourceColor(v.change_source)} className="text-xs">
                        {v.change_source}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>

                  {v.change_summary && (
                    <p className="text-xs text-muted-foreground">{v.change_summary}</p>
                  )}

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => previewVersion(v.id)}
                    >
                      {expandedId === v.id ? (
                        <ChevronUp className="h-3 w-3 mr-1" />
                      ) : (
                        <Eye className="h-3 w-3 mr-1" />
                      )}
                      {expandedId === v.id ? "Hide" : "Preview"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => rollback(v.id, v.version_number)}
                      disabled={rollingBack}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>

                  {expandedId === v.id && previewContent !== null && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px] font-mono">
                      {previewContent}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
