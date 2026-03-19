"use client";

import { useEffect, useState } from "react";
import { Lock, Plus, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Secret {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function SecretsPanel({ agentId }: { agentId: string }) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/secrets`)
      .then((r) => r.json())
      .then((d) => {
        setSecrets(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  async function handleAdd() {
    if (!newName || !newValue) {
      toast.error("Name and value are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, value: newValue, description: newDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save secret");
        return;
      }
      setSecrets((prev) => {
        const existing = prev.findIndex((s) => s.name === data.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
      setShowAdd(false);
      setNewName("");
      setNewValue("");
      setNewDesc("");
      toast.success("Secret saved");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(name: string) {
    try {
      await fetch(`/api/agents/${agentId}/secrets?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      setSecrets((prev) => prev.filter((s) => s.name !== name));
      toast.success("Secret deleted");
    } catch {
      toast.error("Failed to delete secret");
    }
  }

  function copyRef(name: string) {
    navigator.clipboard.writeText(`$GLORB_SECRET_${name}`);
    setCopiedRef(name);
    setTimeout(() => setCopiedRef(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Secrets & Environment Variables
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add Secret
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : secrets.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No secrets yet.</p>
            <p className="text-xs mt-1">
              Add API keys and tokens that your agent needs. Reference them as{" "}
              <code className="bg-muted px-1 rounded">$GLORB_SECRET_NAME</code>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center justify-between p-3 rounded border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-medium">{secret.name}</code>
                    <Badge variant="outline" className="text-[10px]">encrypted</Badge>
                  </div>
                  {secret.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{secret.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => copyRef(secret.name)}
                    title="Copy reference"
                  >
                    {copiedRef === secret.name ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDelete(secret.name)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Secret Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Secret</DialogTitle>
              <DialogDescription>
                Secrets are encrypted at rest and never included in exported manifests.
                Reference them as <code>$GLORB_SECRET_NAME</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Name</label>
                <Input
                  placeholder="OPENAI_API_KEY"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Value</label>
                <div className="relative">
                  <Input
                    type={showValue ? "text" : "password"}
                    placeholder="sk-..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="font-mono pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowValue(!showValue)}
                  >
                    {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Description (optional)</label>
                <Input
                  placeholder="OpenAI API key for code generation"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !newName || !newValue}>
                {saving ? "Saving..." : "Save Secret"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
