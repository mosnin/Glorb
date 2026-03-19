"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { toast } from "sonner";

interface ChatPanelProps {
  sessionId: string;
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const { messages, sendMessage, isLoading, stop } = useChat({
    sessionId,
    onAgentCreated: (_id, name) => {
      toast.success(`Agent "${name}" created`);
    },
    onClusterCreated: (_id, name) => {
      toast.success(`Cluster "${name}" created`);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput
        onSend={sendMessage}
        onStop={stop}
        isLoading={isLoading}
      />
    </div>
  );
}
