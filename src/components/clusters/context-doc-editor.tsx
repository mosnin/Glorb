"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Edit2, Save, Loader2 } from "lucide-react";
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

interface ContextDoc {
  id: string;
  title: string;
  content: string;
  doc_type: string;
  author_agent_id: string | null;
  author_framework: string | null;
  created_at: string;
  updated_at: string;
}

const DOC_TYPES = [
  { value: "shared_context", label: "Shared Context" },
  { value: "decision_log", label: "Decision Log" },
  { value: "status_update", label: "Status Update" },
  { value: "handoff_note", label: "Handoff Note" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ContextDocEditor({ clusterId }: { clusterId: string }) {
  const [docs, setDocs] = useState<ContextDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("shared_context");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/clusters/${clusterId}/sync?type=docs`)
      .then((r) => r.json())
      .then((d) => {
        setDocs(d.context_docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clusterId]);

  async function createDoc() {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/clusters/${clusterId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          doc_type: newType,
          source_framework: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setDocs((prev) => [data, ...prev]);
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      setNewType("shared_context");
      toast.success("Context document created");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(doc: ContextDoc) {
    setEditingId(doc.id);
    setEditContent(doc.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(docId: string) {
    setSaving(true);
    try {
      // Create a new doc version (context docs are append-only for now)
      const doc = docs.find((d) => d.id === docId);
      if (!doc) return;

      const res = await fetch(`/api/v1/clusters/${clusterId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc.title + " (updated)",
          content: editContent,
          doc_type: doc.doc_type,
          source_framework: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setDocs((prev) => [data, ...prev]);
      setEditingId(null);
      toast.success("Document updated");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Context Documents
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3 mr-1" />
            New Document
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No context documents yet.</p>
            <p className="text-xs mt-1">
              Create shared docs so agents across all frameworks stay on the same page.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {docs.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{doc.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{timeAgo(doc.created_at)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => startEdit(doc)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {editingId === doc.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full min-h-24 text-xs font-mono bg-muted p-2 rounded border resize-y"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                      <Button size="sm" onClick={() => saveEdit(doc.id)} disabled={saving}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-2 rounded">
                    {doc.content}
                  </pre>
                )}
                {doc.author_framework && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    via {doc.author_framework}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Context Document</DialogTitle>
              <DialogDescription>
                Shared documents are visible to all agents in this cluster, across all frameworks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Title</label>
                <Input
                  placeholder="Architecture decisions"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {DOC_TYPES.map((t) => (
                    <Button
                      key={t.value}
                      size="sm"
                      variant={newType === t.value ? "default" : "outline"}
                      onClick={() => setNewType(t.value)}
                      className="text-xs h-7"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Content</label>
                <textarea
                  className="w-full min-h-32 text-sm font-mono bg-muted p-3 rounded border resize-y"
                  placeholder="Write the shared context here..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createDoc} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
