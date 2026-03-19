"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: { tool_name: string; arguments: Record<string, unknown>; result?: unknown }[];
  isStreaming?: boolean;
}

interface UseChatOptions {
  sessionId: string;
  onAgentCreated?: (agentId: string, name: string) => void;
  onClusterCreated?: (clusterId: string, name: string) => void;
}

export function useChat({ sessionId, onAgentCreated, onClusterCreated }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, messages: allMessages }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error("Chat request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
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
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "text":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      last.content += data.content;
                    }
                    return [...updated];
                  });
                  break;

                case "tool_call":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      last.toolCalls = [
                        ...(last.toolCalls || []),
                        { tool_name: data.tool_name, arguments: data.arguments },
                      ];
                    }
                    return [...updated];
                  });
                  break;

                case "tool_result": {
                  const result = data.result;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant" && last.toolCalls) {
                      const tc = last.toolCalls.find(
                        (t) => t.tool_name === data.tool_name && !t.result
                      );
                      if (tc) tc.result = result;
                    }
                    return [...updated];
                  });

                  // Notify about created entities
                  if (result?.agent_id && onAgentCreated) {
                    onAgentCreated(result.agent_id, result.name);
                  }
                  if (result?.cluster_id && onClusterCreated) {
                    onClusterCreated(result.cluster_id, result.name);
                  }
                  break;
                }

                case "done":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      last.isStreaming = false;
                    }
                    return [...updated];
                  });
                  break;

                case "error":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      last.content += `\n\n**Error:** ${data.error}`;
                      last.isStreaming = false;
                    }
                    return [...updated];
                  });
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              last.content = "Sorry, something went wrong. Please try again.";
              last.isStreaming = false;
            }
            return [...updated];
          });
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, messages, isLoading, onAgentCreated, onClusterCreated]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { messages, setMessages, sendMessage, isLoading, stop };
}
