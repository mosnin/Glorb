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
    <div className="max-w-3xl mx-auto w-full">
      <div className={cn("flex gap-3", isUser && "justify-end")}>
        {!isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 mt-0.5">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]",
            isUser && "items-end"
          )}
        >
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/60 text-foreground rounded-bl-md"
            )}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.isStreaming && !message.content && (
              <div className="flex gap-1 py-1">
                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-40" style={{ animationDelay: "0ms" }} />
                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-40" style={{ animationDelay: "150ms" }} />
                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-40" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="flex flex-col gap-1 w-full">
              {message.toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                >
                  <Wrench className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">{tc.tool_name}</span>
                  {tc.result != null && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {(tc.result as { success?: boolean })?.success ? "Done" : "Error"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary mt-0.5">
            <User className="h-3.5 w-3.5 text-secondary-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
