"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
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

interface AlertRule {
  id: string;
  agent_id: string | null;
  condition: string;
  threshold: number;
  notify_via: string;
  webhook_url: string | null;
  email: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
  agent?: { id: string; name: string } | null;
}

const CONDITIONS = [
  { value: "offline", label: "Agent Offline", description: "No activity for 30+ minutes" },
  { value: "run_failed", label: "Run Failed", description: "Any run failure" },
  { value: "error_rate", label: "High Error Rate", description: "Errors exceed threshold per hour" },
  { value: "degraded", label: "Degraded", description: "Agent health is degraded" },
];

export function AlertManager({ agentId }: { agentId?: string }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCondition, setNewCondition] = useState("run_failed");
  const [newNotifyVia, setNewNotifyVia] = useState("webhook");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newThreshold, setNewThreshold] = useState("1");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        const allRules = Array.isArray(d) ? d : [];
        // Filter to relevant rules if agentId provided
        setRules(
          agentId
            ? allRules.filter((r: AlertRule) => r.agent_id === agentId || r.agent_id === null)
            : allRules
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  async function createRule() {
    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId || null,
          condition: newCondition,
          threshold: parseInt(newThreshold) || 1,
          notify_via: newNotifyVia,
          webhook_url: newNotifyVia === "webhook" ? newWebhookUrl : null,
          email: newNotifyVia === "email" ? newEmail : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setRules((prev) => [data, ...prev]);
      setShowCreate(false);
      toast.success("Alert rule created");
    } finally {
      setCreating(false);
    }
  }

  async function deleteRule(id: string) {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Alert rule deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert Rules
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3 mr-1" />
            New Alert
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No alert rules configured.</p>
            <p className="text-xs mt-1">Set up alerts to get notified when agents fail or go offline.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {CONDITIONS.find((c) => c.value === rule.condition)?.label || rule.condition}
                    </span>
                    {rule.agent?.name ? (
                      <Badge variant="outline" className="text-[10px]">{rule.agent.name}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">All agents</Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      via {rule.notify_via}
                    </Badge>
                  </div>
                  {rule.condition === "error_rate" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Threshold: {rule.threshold} errors/hour
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Alert Rule</DialogTitle>
              <DialogDescription>
                {agentId
                  ? "Get notified when this agent has issues."
                  : "Get notified about agent issues across your workspace."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Condition</label>
                <div className="space-y-1.5">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewCondition(c.value)}
                      className={`w-full text-left p-2.5 rounded border text-sm transition-colors ${
                        newCondition === c.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{c.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newCondition === "error_rate" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Threshold (errors per hour)</label>
                  <Input
                    type="number"
                    min="1"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block">Notify via</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={newNotifyVia === "webhook" ? "default" : "outline"}
                    onClick={() => setNewNotifyVia("webhook")}
                  >
                    Webhook
                  </Button>
                  <Button
                    size="sm"
                    variant={newNotifyVia === "email" ? "default" : "outline"}
                    onClick={() => setNewNotifyVia("email")}
                  >
                    Email
                  </Button>
                </div>
              </div>

              {newNotifyVia === "webhook" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Webhook URL</label>
                  <Input
                    placeholder="https://hooks.slack.com/..."
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                </div>
              )}

              {newNotifyVia === "email" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createRule} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
