export interface Agent {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  configuration: AgentConfiguration;
  created_at: string;
  updated_at: string;
}

export interface AgentConfiguration {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface AgentFile {
  id: string;
  agent_id: string;
  file_name: string;
  file_path: string;
  file_type: "prompt" | "skill" | "tool" | "role" | "config" | "other";
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  content?: string; // loaded on demand
  created_at: string;
  updated_at: string;
}

export type CreateAgentInput = Pick<Agent, "name"> &
  Partial<Pick<Agent, "description" | "configuration">>;

export type UpdateAgentInput = Partial<
  Pick<Agent, "name" | "description" | "status" | "configuration">
>;

export type CreateAgentFileInput = {
  file_name: string;
  file_path: string;
  file_type: AgentFile["file_type"];
  content: string;
};

export type UpdateAgentFileInput = {
  content?: string;
  file_name?: string;
};
