"use client";

import { useEffect, useState } from "react";
import { Workflow, Plus, Trash2, Loader2, ArrowRight, CircleDot, Pause, CheckCircle2, XCircle, Clock } from "lucide-react";
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

interface Agent {
  id: string;
  name: string;
}

interface OrchRule {
  id: string;
  name: string;
  rule_type: "condition" | "dependency" | "priority";
  from_agent: Agent | null;
  to_agent: Agent | null;
  condition_expr: string | null;
  priority: number;
  enabled: boolean;
}

interface QueueTask {
  id: string;
  status: string;
  priority: number;
  input_message: string;
  output_message: string | null;
  error_message: string | null;
  assigned_agent: Agent | null;
  source_agent: Agent | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

const RULE_TYPES = [
  { value: "condition", label: "Condition", description: "Route based on an expression" },
  { value: "dependency", label: "Dependency", description: "Agent B waits for Agent A" },
  { value: "priority", label: "Priority", description: "Set agent execution priority" },
];

const TASK_STATUS_ICONS: Record<string, typeof CircleDot> = {
  pending: Clock,
  running: CircleDot,
  completed: CheckCircle2,
  failed: XCircle,
  blocked: Pause,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function OrchestrationPanel({ clusterId, agents }: { clusterId: string; agents: Agent[] }) {
  const [rules, setRules] = useState<OrchRule[]>([]);
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showEnqueue, setShowEnqueue] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create rule form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("condition");
  const [newFromAgent, setNewFromAgent] = useState("");
  const [newToAgent, setNewToAgent] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newPriority, setNewPriority] = useState("0");

  // Enqueue form
  const [enqueueAgent, setEnqueueAgent] = useState("");
  const [enqueueMessage, setEnqueueMessage] = useState("");
  const [enqueuePriority, setEnqueuePriority] = useState("0");

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}/orchestration`)
      .then((r) => r.json())
      .then((d) => { setRules(Array.isArray(d) ? d : []); setLoadingRules(false); })
      .catch(() => setLoadingRules(false));

    fetch(`/api/clusters/${clusterId}/orchestration/queue`)
      .then((r) => r.json())
      .then((d) => { setTasks(Array.isArray(d) ? d : []); setLoadingTasks(false); })
      .catch(() => setLoadingTasks(false));
  }, [clusterId]);

  async function createRule() {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch(`/api/clusters/${clusterId}/orchestration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          rule_type: newType,
          from_agent_id: newFromAgent || null,
          to_agent_id: newToAgent || null,
          condition_expr: newCondition || null,
          priority: parseInt(newPriority) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setRules((prev) => [data, ...prev]);
      setShowCreateRule(false);
      resetRuleForm();
      toast.success("Orchestration rule created");
    } finally {
      setCreating(false);
    }
  }

  function resetRuleForm() {
    setNewName("");
    setNewType("condition");
    setNewFromAgent("");
    setNewToAgent("");
    setNewCondition("");
    setNewPriority("0");
  }

  async function deleteRule(id: string) {
    await fetch(`/api/clusters/${clusterId}/orchestration?id=${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  }

  async function enqueueTask() {
    if (!enqueueMessage.trim()) { toast.error("Message is required"); return; }
    setCreating(true);
    try {
      const res = await fetch(`/api/clusters/${clusterId}/orchestration/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_agent_id: enqueueAgent || null,
          input_message: enqueueMessage,
          priority: parseInt(enqueuePriority) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setTasks((prev) => [data, ...prev]);
      setShowEnqueue(false);
      setEnqueueAgent("");
      setEnqueueMessage("");
      setEnqueuePriority("0");
      toast.success("Task enqueued");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Orchestration Rules
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreateRule(true)}>
              <Plus className="h-3 w-3 mr-1" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Workflow className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No orchestration rules defined.</p>
              <p className="text-xs mt-1">Create rules to control how agents hand off tasks and coordinate.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.rule_type}</Badge>
                      {rule.priority > 0 && (
                        <Badge variant="secondary" className="text-[10px]">P{rule.priority}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      {rule.from_agent && (
                        <>
                          <span className="font-medium">{rule.from_agent.name}</span>
                          <ArrowRight className="h-3 w-3" />
                        </>
                      )}
                      {rule.to_agent && <span className="font-medium">{rule.to_agent.name}</span>}
                      {rule.condition_expr && (
                        <code className="ml-2 bg-muted px-1.5 py-0.5 rounded text-[10px]">
                          {rule.condition_expr}
                        </code>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-4 w-4" />
              Task Queue
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowEnqueue(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Enqueue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks in queue.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const Icon = TASK_STATUS_ICONS[task.status] || Clock;
                return (
                  <div key={task.id} className="flex items-start gap-2 p-2.5 rounded border">
                    <Icon className={`h-4 w-4 mt-0.5 ${
                      task.status === "completed" ? "text-green-500" :
                      task.status === "failed" ? "text-red-500" :
                      task.status === "running" ? "text-blue-500" :
                      task.status === "blocked" ? "text-yellow-500" :
                      "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.input_message}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {task.assigned_agent && <span>→ {task.assigned_agent.name}</span>}
                        {task.source_agent && <span>from {task.source_agent.name}</span>}
                        <span>{timeAgo(task.created_at)}</span>
                      </div>
                      {task.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{task.error_message}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{task.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Orchestration Rule</DialogTitle>
            <DialogDescription>Define how agents coordinate and hand off work.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Name</label>
              <Input placeholder="Escalation routing" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Rule Type</label>
              <div className="space-y-1.5">
                {RULE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewType(t.value)}
                    className={`w-full text-left p-2 rounded border text-sm ${
                      newType === t.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">From Agent</label>
                <select className="w-full text-sm border rounded px-2 py-1.5 bg-background" value={newFromAgent} onChange={(e) => setNewFromAgent(e.target.value)}>
                  <option value="">None</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">To Agent</label>
                <select className="w-full text-sm border rounded px-2 py-1.5 bg-background" value={newToAgent} onChange={(e) => setNewToAgent(e.target.value)}>
                  <option value="">None</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            {newType === "condition" && (
              <div>
                <label className="text-xs font-medium mb-1 block">Condition Expression</label>
                <Input
                  placeholder='sentiment < 0.3 or output contains "escalate"'
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">Priority</label>
              <Input type="number" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRule(false)}>Cancel</Button>
            <Button onClick={createRule} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enqueue Task Dialog */}
      <Dialog open={showEnqueue} onOpenChange={setShowEnqueue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enqueue Task</DialogTitle>
            <DialogDescription>Add a task to the cluster queue for an agent to process.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Assign to Agent</label>
              <select className="w-full text-sm border rounded px-2 py-1.5 bg-background" value={enqueueAgent} onChange={(e) => setEnqueueAgent(e.target.value)}>
                <option value="">Unassigned (auto-route)</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Task Message</label>
              <textarea
                className="w-full min-h-20 text-sm bg-muted p-2 rounded border resize-y"
                placeholder="Describe the task..."
                value={enqueueMessage}
                onChange={(e) => setEnqueueMessage(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Priority</label>
              <Input type="number" value={enqueuePriority} onChange={(e) => setEnqueuePriority(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnqueue(false)}>Cancel</Button>
            <Button onClick={enqueueTask} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enqueue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
