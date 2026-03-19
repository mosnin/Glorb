"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WorkspaceMember {
  id: string;
  owner_id: string;
  member_id: string;
  member_email: string;
  role: string;
  invited_at: string;
  accepted_at: string | null;
}

export function WorkspaceManager() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setSharedWithMe(data.shared_with_me || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        toast.success("Member invited");
        setShowInvite(false);
        setEmail("");
        load();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to invite");
      }
    } finally {
      setInviting(false);
    }
  };

  const remove = async (memberId: string) => {
    const res = await fetch(`/api/workspace/members?member_id=${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.member_id !== memberId));
      toast.success("Member removed");
    }
  };

  const changeRole = async (memberId: string, newRole: string) => {
    const res = await fetch(`/api/workspace/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.member_id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated");
    } else {
      toast.error("Failed to update role");
    }
  };

  const roleColor = (r: string): "default" | "secondary" | "outline" => {
    switch (r) {
      case "admin": return "default";
      case "editor": return "secondary";
      default: return "outline";
    }
  };

  const roleDescriptions: Record<string, string> = {
    admin: "Full access — manage members, agents, clusters, and settings",
    editor: "Can create and edit agents and clusters",
    viewer: "Read-only access to agents, clusters, and analytics",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Workspace
            </CardTitle>
            <CardDescription>
              Invite team members to collaborate on your agents and clusters.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Invite
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {/* My workspace members */}
            <div>
              <h3 className="text-sm font-medium mb-2">My Workspace Members</h3>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team members yet. Invite someone to start collaborating.
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded border"
                    >
                      <div>
                        <p className="text-sm font-medium">{m.member_email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {new Date(m.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.member_id, e.target.value)}
                          className="text-xs border rounded px-2 py-1 bg-background"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => remove(m.member_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared with me */}
            {sharedWithMe.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Shared With Me</h3>
                <div className="space-y-2">
                  {sharedWithMe.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded border"
                    >
                      <p className="text-sm">
                        Workspace of <span className="font-medium">{m.owner_id}</span>
                      </p>
                      <Badge variant={roleColor(m.role)} className="text-xs">
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Invite someone to your workspace. They&apos;ll have access to your agents and clusters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-2">
                {(["admin", "editor", "viewer"] as const).map((r) => (
                  <Button
                    key={r}
                    variant={role === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRole(r)}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={invite} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
