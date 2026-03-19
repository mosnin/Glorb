"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Github, Key, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [githubConnected, setGithubConnected] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key_prefix: string; created_at: string }[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check URL for GitHub connection status
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") {
      setGithubConnected(true);
      toast.success("GitHub connected successfully");
    }
  }, []);

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    // Generate key client-side, send hash to server
    const key = `glrb_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(key))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );

    // In a real implementation, this would POST to an API route
    // For now, show the key and add to local state
    setApiKeys((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newKeyName,
        key_prefix: key.slice(0, 12),
        created_at: new Date().toISOString(),
      },
    ]);
    setNewKeyName("");

    // Copy to clipboard
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    toast.success(
      `API key created and copied to clipboard. Key hash: ${keyHash.slice(0, 8)}...`
    );
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your connections and API access.
        </p>
      </div>

      {/* GitHub Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Connection
          </CardTitle>
          <CardDescription>
            Connect your GitHub account to sync agents and clusters to repositories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {githubConnected ? (
            <div className="flex items-center gap-2">
              <Badge variant="default">Connected</Badge>
              <span className="text-sm text-muted-foreground">
                Your GitHub account is linked.
              </span>
            </div>
          ) : (
            <Button render={<a href="/api/github/connect" />}>
                <Github className="h-4 w-4 mr-2" />
                Connect GitHub
            </Button>
          )}
        </CardContent>
      </Card>

      {/* API Keys for MCP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys for MCP access. Use these in Claude Code, Cursor, or
            other agentic platforms to access your Glorb agents and clusters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., 'Claude Code')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button onClick={generateApiKey}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Generate
            </Button>
          </div>

          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium mb-2">MCP Configuration</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
