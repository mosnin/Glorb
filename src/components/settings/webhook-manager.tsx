"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const AVAILABLE_EVENTS = [
  { value: "agent.run.started", label: "Agent Run Started" },
  { value: "agent.run.completed", label: "Agent Run Completed" },
  { value: "agent.run.failed", label: "Agent Run Failed" },
  { value: "cluster.run.started", label: "Cluster Run Started" },
  { value: "cluster.run.completed", label: "Cluster Run Completed" },
  { value: "cluster.run.failed", label: "Cluster Run Failed" },
  { value: "agent.file.updated", label: "Agent File Updated" },
  { value: "test.run.completed", label: "Test Run Completed" },
];

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface Delivery {
  id: string;
  event_type: string;
  status_code: number | null;
  created_at: string;
  delivered_at: string | null;
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/manage");
      if (res.ok) setWebhooks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const createWebhook = async () => {
    if (!newName.trim() || !newUrl.trim() || selectedEvents.size === 0) {
      toast.error("Name, URL, and at least one event are required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          url: newUrl,
          events: Array.from(selectedEvents),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewSecret(data.secret);
        setShowAdd(false);
        setNewName("");
        setNewUrl("");
        setSelectedEvents(new Set());
        loadWebhooks();
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/webhooks/manage/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleActive = async (webhook: WebhookEntry) => {
    const res = await fetch(`/api/webhooks/manage/${webhook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !webhook.is_active }),
    });
    if (res.ok) {
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, is_active: !w.is_active } : w))
      );
    }
  };

  const loadDeliveries = async (webhookId: string) => {
    if (expandedId === webhookId) {
      setExpandedId(null);
      return;
    }
    const res = await fetch(`/api/webhooks/manage/${webhookId}/deliveries`);
    if (res.ok) {
      setDeliveries(await res.json());
      setExpandedId(webhookId);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>Receive HTTP notifications when events occur.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Webhook
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No webhooks configured. Add one to receive event notifications.
          </p>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle
                    className={`h-2.5 w-2.5 ${
                      webhook.is_active ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
                    }`}
                  />
                  <span className="text-sm font-medium">{webhook.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleActive(webhook)}
                  >
                    {webhook.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => loadDeliveries(webhook.id)}
                  >
                    {expandedId === webhook.id ? (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    )}
                    Logs
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteWebhook(webhook.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {webhook.url}
              </p>
              <div className="flex gap-1 flex-wrap">
                {webhook.events.map((e) => (
                  <Badge key={e} variant="secondary" className="text-xs">
                    {e}
                  </Badge>
                ))}
              </div>

              {expandedId === webhook.id && (
                <div className="mt-2 border-t pt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent Deliveries</p>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                  ) : (
                    deliveries.slice(0, 10).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <div className="flex items-center gap-2">
                          {d.status_code && d.status_code >= 200 && d.status_code < 300 ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>{d.event_type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{d.status_code || "failed"}</span>
                          <span>{new Date(d.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      {/* Add webhook dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Slack notifications"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Events</label>
              <div className="grid grid-cols-2 gap-1.5">
                {AVAILABLE_EVENTS.map((evt) => (
                  <Button
                    key={evt.value}
                    variant={selectedEvents.has(evt.value) ? "default" : "outline"}
                    size="sm"
                    className="text-xs justify-start h-8"
                    onClick={() => toggleEvent(evt.value)}
                  >
                    {evt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={createWebhook} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret display dialog */}
      <Dialog open={!!newSecret} onOpenChange={() => setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Secret</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Use this secret to verify webhook signatures. Store it securely — you won&apos;t see it again.
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-muted p-3 rounded font-mono break-all">
              {newSecret}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={async () => {
                if (newSecret) await navigator.clipboard.writeText(newSecret);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
