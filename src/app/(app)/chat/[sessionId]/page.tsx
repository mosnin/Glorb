"use client";

import { use } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)]">
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
