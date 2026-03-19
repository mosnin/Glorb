"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Bot, Crown } from "lucide-react";

interface AgentNode {
  agentId: string;
  name: string;
  role: string | null;
  isManager: boolean;
  positionX: number;
  positionY: number;
}

interface HandoffEdge {
  fromAgentId: string;
  toAgentId: string;
  condition: string;
}

interface ClusterVisualizationProps {
  agents: AgentNode[];
  handoffs: HandoffEdge[];
  onPositionChange?: (agentId: string, x: number, y: number) => void;
}

function AgentNodeComponent({ data }: { data: { name: string; role: string | null; isManager: boolean } }) {
  return (
    <div className="bg-card border rounded-lg p-3 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="flex items-center gap-2">
        {data.isManager ? (
          <Crown className="h-4 w-4 text-yellow-500" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{data.name}</span>
      </div>
      {data.role && (
        <p className="text-xs text-muted-foreground mt-1">{data.role}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

const nodeTypes = { agent: AgentNodeComponent };

export function ClusterVisualization({
  agents,
  handoffs,
  onPositionChange,
}: ClusterVisualizationProps) {
  const initialNodes: Node[] = useMemo(
    () =>
      agents.map((a, i) => ({
        id: a.agentId,
        type: "agent",
        position: { x: a.positionX || i * 200, y: a.positionY || i * 100 },
        data: { name: a.name, role: a.role, isManager: a.isManager },
      })),
    [agents]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      handoffs.map((h, i) => ({
        id: `edge-${i}`,
        source: h.fromAgentId,
        target: h.toAgentId,
        label: h.condition,
        animated: true,
        style: { stroke: "hsl(var(--primary))" },
        labelStyle: { fontSize: 10 },
      })),
    [handoffs]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Persist position changes
      for (const change of changes) {
        if (change.type === "position" && change.position && change.dragging === false) {
          onPositionChange?.(change.id, change.position.x, change.position.y);
        }
      }
    },
    [onNodesChange, onPositionChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
