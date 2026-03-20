"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  placeholder = "Describe the agents you want to build...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-border/80">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent"
            rows={1}
          />
          {isLoading ? (
            <Button variant="destructive" size="icon" className="shrink-0 rounded-xl h-9 w-9" onClick={onStop}>
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="icon" className="shrink-0 rounded-xl h-9 w-9" onClick={handleSubmit} disabled={!value.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
          Glorb may make mistakes. Verify important agent configurations.
        </p>
      </div>
    </div>
  );
}
