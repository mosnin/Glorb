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
    <div className="flex-1 flex flex-col h-screen">
      <div className="border-b px-4 py-3 flex items-center">
        <h1 className="font-semibold">Chat</h1>
      </div>
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
