"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewChatPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isCreating) return;
    setIsCreating(true);

    // Create a new chat session and redirect
    fetch("/api/chat-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          router.replace(`/chat/${data.id}`);
        }
      })
      .catch(() => {
        // If session creation fails, still show the page
        setIsCreating(false);
      });
  }, [router, isCreating]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        Creating new chat session...
      </div>
    </div>
  );
}
