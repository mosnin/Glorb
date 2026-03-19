"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Square, Wrench, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClusterMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentName?: string;
  agentId?: string;
  toolCalls?: { name: string; input: Record<string, unknown>; result?: string }[];
  handoffs?: { from: string; to: string; condition: string }[];
}

export function ClusterRunner({ clusterId }: { clusterId: string }) {
  const [messages, setMessages] = useState<ClusterMessage[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isRunning) return;

    const userMsg: ClusterMessage = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsRunning(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [], handoffs: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/clusters/${clusterId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
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
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.agentName) setCurrentAgent(event.agentName);

            if (event.type === "text" && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content, agentName: event.agentName }
                    : m
                )
              );
            }

            if (event.type === "tool_use" && event.handoff) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, handoffs: [...(m.handoffs || []), event.handoff] }
                    : m
                )
              );
            }

            if (event.type === "tool_use" && !event.handoff) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls || []), { name: event.tool_name, input: event.tool_input }] }
                    : m
                )
              );
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || "Error occurred." } : m))
        );
      }
    } finally {
      setIsRunning(false);
      setCurrentAgent(null);
      abortRef.current = null;
    }
  }, [input, isRunning, clusterId]);

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.handoffs?.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1 justify-center">
                  <Badge variant="outline" className="text-xs">{h.from}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs">{h.to}</Badge>
                  <span className="text-xs">({h.condition})</span>
                </div>
              ))}
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.agentName && msg.role === "assistant" && (
                    <Badge variant="secondary" className="text-xs mb-1">{msg.agentName}</Badge>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.toolCalls.map((tc, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Wrench className="h-3 w-3" />
                          <Badge variant="outline" className="text-xs">{tc.name}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Loader2 className="h-3 w-3 animate-spin" />
              {currentAgent ? `${currentAgent} is working...` : "Processing..."}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message to the cluster..."
          className="min-h-[40px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {isRunning ? (
          <Button size="icon" variant="outline" onClick={() => abortRef.current?.abort()}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
