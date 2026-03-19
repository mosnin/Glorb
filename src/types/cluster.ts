import type { Agent, AgentFile } from "./agent";

export interface Cluster {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  manager_agent_id: string | null;
  interaction_map: InteractionMap;
  handoff_definitions: HandoffDefinition[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface InteractionMap {
  [agentId: string]: string[]; // adjacency list: agent -> agents it can hand off to
}

export interface HandoffDefinition {
  from_agent_id: string;
  to_agent_id: string;
  condition: string;
  description?: string;
}

export interface ClusterAgent {
  id: string;
  cluster_id: string;
  agent_id: string;
  role_in_cluster: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
  agent?: Agent; // joined
}

export interface ClusterFile {
  id: string;
  cluster_id: string;
  file_name: string;
  file_path: string;
  file_type: "cluster_prompt" | "role" | "handoff" | "config" | "other";
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  content?: string;
  created_at: string;
  updated_at: string;
}

export type CreateClusterInput = Pick<Cluster, "name"> &
  Partial<Pick<Cluster, "description">>;

export type UpdateClusterInput = Partial<
  Pick<
    Cluster,
    | "name"
    | "description"
    | "manager_agent_id"
    | "interaction_map"
    | "handoff_definitions"
    | "status"
  >
>;

export interface ClusterWithAgents extends Cluster {
  cluster_agents: (ClusterAgent & { agent: Agent })[];
  files: ClusterFile[];
}

export interface AgentWithFiles extends Agent {
  files: AgentFile[];
}
