"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Github, Key, Copy, Check, Trash2, Loader2, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [githubConnected, setGithubConnected] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") {
      setGithubConnected(true);
      toast.success("GitHub connected successfully");
    }

    fetch("/api/api-keys")
      .then((res) => res.json())
      .then((data) => {
        setApiKeys(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreateKey() {
    if (!newKeyName.trim()) { toast.error("Enter a key name"); return; }
    setCreating(true);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewRawKey(data.raw_key);
        setApiKeys((prev) => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, last_used_at: null, created_at: data.created_at }, ...prev]);
        setNewKeyName("");
      } else {
        toast.error(data.error || "Failed to create key");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await fetch(`/api/api-keys/${keyId}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
    setRevokeId(null);
  }

  async function copyKey() {
    if (newRawKey) {
      await navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your connections and API access.</p>
      </div>

      {/* GitHub Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Connection
          </CardTitle>
          <CardDescription>Connect your GitHub account to sync agents and clusters to repositories.</CardDescription>
        </CardHeader>
        <CardContent>
          {githubConnected ? (
            <div className="flex items-center gap-2">
              <Badge variant="default">Connected</Badge>
              <span className="text-sm text-muted-foreground">Your GitHub account is linked.</span>
            </div>
          ) : (
            <Button render={<a href="/api/github/connect" />}>
              <Github className="h-4 w-4 mr-2" />
              Connect GitHub
            </Button>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Generate API keys for MCP, CLI, and public API access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., 'Claude Code')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
            />
            <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded border">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {key.last_used_at ? `Used ${new Date(key.last_used_at).toLocaleDateString()}` : "Never used"}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => setRevokeId(key.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">MCP Configuration</p>
            <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
{`{
  "mcpServers": {
    "glorb": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
            </pre>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              CLI Setup
            </p>
            <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
{`npm install -g glorb
glorb login YOUR_API_KEY
glorb list agents
glorb pull agent <agent-id>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* New key dialog */}
      <Dialog open={!!newRawKey} onOpenChange={() => setNewRawKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-muted p-3 rounded font-mono break-all">{newRawKey}</code>
            <Button size="icon" variant="outline" onClick={copyKey}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewRawKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>This key will stop working immediately. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => revokeId && handleRevoke(revokeId)}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
