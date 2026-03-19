"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Memory {
  id: string;
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function MemoryPanel({ agentId }: { agentId: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/memories`);
      if (res.ok) setMemories(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const addMemory = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error("Key and value are required");
      return;
    }

    const res = await fetch(`/api/agents/${agentId}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, value: newValue }),
    });

    if (res.ok) {
      toast.success("Memory added");
      setShowAdd(false);
      setNewKey("");
      setNewValue("");
      loadMemories();
    }
  };

  const updateMemory = async (key: string) => {
    const res = await fetch(`/api/agents/${agentId}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: editValue }),
    });

    if (res.ok) {
      toast.success("Memory updated");
      setEditingId(null);
      loadMemories();
    }
  };

  const deleteMemory = async (id: string) => {
    const res = await fetch(`/api/agents/${agentId}/memories?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Agent Memory
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Persistent key-value memories the agent can store and recall across conversations.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No memories yet. The agent will create them automatically during conversations, or you can add them manually.
          </p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {memories.map((mem) => (
                <div key={mem.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-primary">
                      {mem.key}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(mem.updated_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteMemory(mem.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {editingId === mem.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => updateMemory(mem.key)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="text-sm cursor-pointer hover:bg-muted rounded px-1 -mx-1"
                      onClick={() => {
                        setEditingId(mem.id);
                        setEditValue(mem.value);
                      }}
                    >
                      {mem.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., user_preference, project_stack"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Value</label>
              <Textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="The value to remember"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addMemory}>Add Memory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
