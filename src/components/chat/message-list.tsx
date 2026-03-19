"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "@/hooks/use-chat";

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-md">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-2xl font-bold text-primary">G</span>
          </div>
          <h2 className="text-xl font-semibold">Welcome to Glorb</h2>
          <p className="text-muted-foreground text-sm">
            Describe the AI agents or clusters you want to build. I&apos;ll architect
            them for you — including prompts, skills, tools, roles, and
            handoff definitions.
          </p>
          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>&quot;Build me a code review agent with expertise in React&quot;</p>
            <p>&quot;Create a customer support cluster with triage, escalation, and resolution agents&quot;</p>
            <p>&quot;Design a research team with a manager, web researcher, and analyst&quot;</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
