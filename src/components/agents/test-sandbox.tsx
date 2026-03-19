"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface TestCase {
  id: string;
  name: string;
  input_message: string;
  expected_behavior: string | null;
  tags: string[];
  created_at: string;
}

interface TestResult {
  test_case_id: string;
  name: string;
  status: "pending" | "running" | "passed" | "failed" | "error";
  response?: string;
  duration_ms?: number;
}

export function TestSandbox({ agentId }: { agentId: string }) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // New test case form
  const [newName, setNewName] = useState("");
  const [newInput, setNewInput] = useState("");
  const [newExpected, setNewExpected] = useState("");

  const loadTests = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}/tests`);
    if (res.ok) setTestCases(await res.json());
  }, [agentId]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const addTestCase = async () => {
    if (!newName.trim() || !newInput.trim()) {
      toast.error("Name and input message are required");
      return;
    }

    const res = await fetch(`/api/agents/${agentId}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        input_message: newInput,
        expected_behavior: newExpected || null,
      }),
    });

    if (res.ok) {
      toast.success("Test case added");
      setShowAddDialog(false);
      setNewName("");
      setNewInput("");
      setNewExpected("");
      loadTests();
    }
  };

  const deleteTestCase = async (id: string) => {
    const res = await fetch(`/api/agents/${agentId}/tests?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === testCases.length) setSelected(new Set());
    else setSelected(new Set(testCases.map((tc) => tc.id)));
  };

  const runTests = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error("Select test cases to run");
      return;
    }

    setIsRunning(true);
    setResults(new Map());

    // Mark all as pending
    const initial = new Map<string, TestResult>();
    for (const id of ids) {
      const tc = testCases.find((t) => t.id === id);
      if (tc) initial.set(id, { test_case_id: id, name: tc.name, status: "pending" });
    }
    setResults(initial);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/${agentId}/tests/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_case_ids: ids }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "test_started") {
              setResults((prev) => {
                const next = new Map(prev);
                next.set(event.test_case_id, {
                  test_case_id: event.test_case_id,
                  name: event.name,
                  status: "running",
                });
                return next;
              });
            }

            if (event.type === "test_completed") {
              setResults((prev) => {
                const next = new Map(prev);
                next.set(event.test_case_id, {
                  test_case_id: event.test_case_id,
                  name: event.name,
                  status: event.status,
                  response: event.response,
                  duration_ms: event.duration_ms,
                });
                return next;
              });
            }

            if (event.type === "run_completed") {
              toast.success(
                `Tests complete: ${event.passed} passed, ${event.failed} failed`
              );
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Test run failed");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Test Sandbox
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Test
            </Button>
            <Button
              size="sm"
              onClick={runTests}
              disabled={isRunning || selected.size === 0}
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5 mr-1" />
              )}
              Run {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {testCases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No test cases yet. Add one to start testing your agent.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                {selected.size === testCases.length ? "Deselect All" : "Select All"}
              </Button>
              {isRunning && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => abortRef.current?.abort()}
                >
                  Stop
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {testCases.map((tc) => {
                  const result = results.get(tc.id);
                  return (
                    <div
                      key={tc.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selected.has(tc.id) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSelect(tc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected.has(tc.id)}
                            onChange={() => toggleSelect(tc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {result ? statusIcon(result.status) : null}
                          <span className="text-sm font-medium">{tc.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {result?.duration_ms && (
                            <Badge variant="outline" className="text-xs">
                              {result.duration_ms}ms
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTestCase(tc.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Input: {tc.input_message}
                      </p>
                      {tc.expected_behavior && (
                        <p className="text-xs text-muted-foreground truncate">
                          Expected: {tc.expected_behavior}
                        </p>
                      )}
                      {result?.response && (
                        <div className="mt-2 text-xs bg-muted p-2 rounded max-h-[100px] overflow-auto">
                          {result.response}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Test Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Basic greeting test"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Message</label>
              <Textarea
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Hello, can you help me?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Behavior (optional)</label>
              <Textarea
                value={newExpected}
                onChange={(e) => setNewExpected(e.target.value)}
                placeholder="Agent should respond with a greeting and offer assistance"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addTestCase}>Add Test Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
