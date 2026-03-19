import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const ARCHITECT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_agent",
      description:
        "Create a new agent with a name and description. This creates the agent record and an initial prompt.md file.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the agent (e.g., 'Code Reviewer', 'Research Assistant')",
          },
          description: {
            type: "string",
            description: "A brief description of what this agent does",
          },
          prompt_content: {
            type: "string",
            description: "The full system prompt for the agent (written in markdown)",
          },
          role_content: {
            type: "string",
            description: "The role definition for the agent (written in markdown)",
          },
        },
        required: ["name", "description", "prompt_content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agent_file",
      description:
        "Create or update a file within an agent's folder. Use this for skills, tools, and other config files.",
      parameters: {
        type: "object",
        properties: {
          agent_id: {
            type: "string",
            description: "The ID of the agent to add the file to",
          },
          file_path: {
            type: "string",
            description:
              "Relative path within the agent folder (e.g., 'skills/research.md', 'tools/web_search.json')",
          },
          file_type: {
            type: "string",
            enum: ["prompt", "skill", "tool", "role", "config", "other"],
            description: "The type of file",
          },
          content: {
            type: "string",
            description: "The full content of the file",
          },
        },
        required: ["agent_id", "file_path", "file_type", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_cluster",
      description:
        "Create a new cluster of agents with a name, description, and cluster prompt.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the cluster",
          },
          description: {
            type: "string",
            description: "A brief description of the cluster's purpose",
          },
          cluster_prompt_content: {
            type: "string",
            description:
              "The cluster-level prompt defining overall behavior and coordination rules (markdown)",
          },
        },
        required: ["name", "description", "cluster_prompt_content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_agent_to_cluster",
      description:
        "Add an existing agent to a cluster with a specific role.",
      parameters: {
        type: "object",
        properties: {
          cluster_id: {
            type: "string",
            description: "The ID of the cluster",
          },
          agent_id: {
            type: "string",
            description: "The ID of the agent to add",
          },
          role_in_cluster: {
            type: "string",
            description:
              "The agent's role within the cluster (e.g., 'manager', 'researcher', 'reviewer')",
          },
        },
        required: ["cluster_id", "agent_id", "role_in_cluster"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_manager_agent",
      description: "Set which agent is the manager/orchestrator of a cluster.",
      parameters: {
        type: "object",
        properties: {
          cluster_id: {
            type: "string",
            description: "The ID of the cluster",
          },
          agent_id: {
            type: "string",
            description: "The ID of the agent to set as manager",
          },
        },
        required: ["cluster_id", "agent_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "define_handoff",
      description:
        "Define a handoff rule between two agents in a cluster.",
      parameters: {
        type: "object",
        properties: {
          cluster_id: {
            type: "string",
            description: "The ID of the cluster",
          },
          from_agent_id: {
            type: "string",
            description: "The agent handing off work",
          },
          to_agent_id: {
            type: "string",
            description: "The agent receiving the work",
          },
          condition: {
            type: "string",
            description:
              "The condition that triggers this handoff (e.g., 'when code review is needed', 'when research is complete')",
          },
          description: {
            type: "string",
            description: "Human-readable description of this handoff",
          },
        },
        required: ["cluster_id", "from_agent_id", "to_agent_id", "condition"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_cluster_file",
      description:
        "Create a file at the cluster level (role definitions, handoff documentation, etc).",
      parameters: {
        type: "object",
        properties: {
          cluster_id: {
            type: "string",
            description: "The ID of the cluster",
          },
          file_path: {
            type: "string",
            description:
              "Relative path within the cluster folder (e.g., 'roles/manager.md', 'handoffs/triage.md')",
          },
          file_type: {
            type: "string",
            enum: ["cluster_prompt", "role", "handoff", "config", "other"],
            description: "The type of file",
          },
          content: {
            type: "string",
            description: "The full content of the file",
          },
        },
        required: ["cluster_id", "file_path", "file_type", "content"],
      },
    },
  },
];
