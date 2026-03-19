export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  agent_id: string | null;
  cluster_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: ChatMessageMetadata;
  created_at: string;
}

export interface ChatMessageMetadata {
  tool_calls?: ToolCallResult[];
  files_changed?: string[];
  agents_created?: string[];
  clusters_created?: string[];
  [key: string]: unknown;
}

export interface ToolCallResult {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export type CreateChatSessionInput = {
  title?: string;
  agent_id?: string;
  cluster_id?: string;
};

export interface StreamingChatRequest {
  session_id: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}
