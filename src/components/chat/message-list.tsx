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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="text-center space-y-6 max-w-lg">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
            <span className="text-lg font-bold text-white">G</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">What would you like to build?</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Describe your AI agents or clusters in plain language.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              "Build a code review agent for React",
              "Create a customer support cluster",
              "Design a research team with 3 agents",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => {
                  // Find the textarea and set its value programmatically
                  const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
                  if (textarea) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                    nativeInputValueSetter?.call(textarea, prompt);
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                    textarea.focus();
                  }
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-5 px-4 py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
