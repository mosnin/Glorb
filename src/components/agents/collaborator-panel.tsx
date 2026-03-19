"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  added_at: string;
  user: {
    clerk_id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function CollaboratorPanel({ agentId }: { agentId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/collaborators`);
      if (res.ok) setCollaborators(await res.json());
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        toast.success("Collaborator added");
        setShowAdd(false);
        setEmail("");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add collaborator");
      }
    } finally {
      setAdding(false);
    }
  };

  const remove = async (userId: string) => {
    const res = await fetch(`/api/agents/${agentId}/collaborators?user_id=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaborators
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Invite
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No collaborators yet. Invite team members to work on this agent together.
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-3">
                  {c.user?.avatar_url ? (
                    <img
                      src={c.user.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {(c.user?.display_name || c.user?.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {c.user?.display_name || c.user?.email || "Unknown"}
                    </p>
                    {c.user?.display_name && (
                      <p className="text-xs text-muted-foreground">{c.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {c.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => remove(c.user_id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-2">
                <Button
                  variant={role === "editor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("editor")}
                >
                  Editor
                </Button>
                <Button
                  variant={role === "viewer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("viewer")}
                >
                  Viewer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Editors can modify files and run the agent. Viewers can only view.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={add} disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
