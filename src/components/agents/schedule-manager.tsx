"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  cron_expression: string;
  input_message: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
}

const CRON_PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 9 AM", value: "0 9 * * *" },
  { label: "Weekdays 9 AM", value: "0 9 * * 1-5" },
  { label: "Weekly", value: "0 0 * * 0" },
  { label: "Monthly", value: "0 0 1 * *" },
];

export function ScheduleManager({ agentId }: { agentId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCron, setNewCron] = useState("0 9 * * *");
  const [newMessage, setNewMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/schedules`);
      if (res.ok) setSchedules(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim() || !newMessage.trim()) {
      toast.error("Name and input message are required");
      return;
    }

    const res = await fetch(`/api/agents/${agentId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        cron_expression: newCron,
        input_message: newMessage,
      }),
    });

    if (res.ok) {
      toast.success("Schedule created");
      setShowAdd(false);
      setNewName("");
      setNewMessage("");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create schedule");
    }
  };

  const toggle = async (schedule: Schedule) => {
    const res = await fetch(`/api/agents/${agentId}/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !schedule.is_active }),
    });
    if (res.ok) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/agents/${agentId}/schedules/${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function timeUntil(dateStr: string | null) {
    if (!dateStr) return "—";
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return "overdue";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    return `in ${Math.floor(hrs / 24)}d`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedules
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No schedules. Add one to run this agent automatically.
          </p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                      {s.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggle(s)}
                    >
                      {s.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{s.cron_expression}</span>
                  <span>Runs: {s.run_count}</span>
                  <span>Last: {timeAgo(s.last_run_at)}</span>
                  <span>Next: {timeUntil(s.next_run_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Input: {s.input_message}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Daily report"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule</label>
              <div className="flex gap-1.5 flex-wrap">
                {CRON_PRESETS.map((p) => (
                  <Button
                    key={p.value}
                    variant={newCron === p.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setNewCron(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Input
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 9 * * *"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Message</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Generate the daily summary report"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
