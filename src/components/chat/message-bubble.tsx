"use client";

import { Bot, User, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {message.isStreaming && !message.content && (
            <div className="flex gap-1 py-1">
              <span className="animate-bounce h-2 w-2 rounded-full bg-current opacity-60" style={{ animationDelay: "0ms" }} />
              <span className="animate-bounce h-2 w-2 rounded-full bg-current opacity-60" style={{ animationDelay: "150ms" }} />
              <span className="animate-bounce h-2 w-2 rounded-full bg-current opacity-60" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border text-xs"
              >
                <Wrench className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{tc.tool_name}</span>
                {tc.result != null && (
                  <Badge variant="secondary" className="text-xs">
                    {(tc.result as { success?: boolean })?.success ? "Done" : "Error"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
