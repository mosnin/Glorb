"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Bot, Plus, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface ClusterAgent {
  agent_id: string;
  role_in_cluster: string | null;
  position_x: number;
  position_y: number;
  agent: { id: string; name: string; description: string };
}

interface BuilderProps {
  clusterId: string;
  initialAgents: ClusterAgent[];
  initialHandoffs: { from_agent_id: string; to_agent_id: string; condition: string }[];
  managerAgentId: string | null;
  userAgents: { id: string; name: string; description: string }[];
}

export function ClusterBuilder({ clusterId, initialAgents, initialHandoffs, managerAgentId, userAgents }: BuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [handoffDialog, setHandoffDialog] = useState<{ source: string; target: string } | null>(null);
  const [handoffCondition, setHandoffCondition] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  // Initialize nodes and edges from data
  useEffect(() => {
    const initialNodes: Node[] = initialAgents.map((ca) => ({
      id: ca.agent_id,
      position: { x: ca.position_x || Math.random() * 600, y: ca.position_y || Math.random() * 400 },
      data: {
        label: (
          <div className="flex items-center gap-2 px-2">
            <Bot className="h-4 w-4" />
            <span>{ca.agent.name}</span>
            {ca.agent_id === managerAgentId && <Crown className="h-3 w-3 text-yellow-500" />}
          </div>
        ),
        agentName: ca.agent.name,
        role: ca.role_in_cluster,
      },
      style: {
        background: ca.agent_id === managerAgentId ? "#fef3c7" : "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "8px",
      },
    }));

    const initialEdges: Edge[] = initialHandoffs.map((h, i) => ({
      id: `handoff-${i}`,
      source: h.from_agent_id,
      target: h.to_agent_id,
      label: h.condition,
      animated: true,
      style: { stroke: "#6366f1" },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialAgents, initialHandoffs, managerAgentId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setHandoffDialog({ source: connection.source!, target: connection.target! });
    },
    []
  );

  const handleCreateHandoff = async () => {
    if (!handoffDialog || !handoffCondition.trim()) return;

    try {
      const res = await fetch(`/api/clusters/${clusterId}/handoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_agent_id: handoffDialog.source,
          to_agent_id: handoffDialog.target,
          condition: handoffCondition,
        }),
      });

      if (res.ok) {
        setEdges((eds) =>
          addEdge(
            {
              ...{ source: handoffDialog.source, target: handoffDialog.target, sourceHandle: null, targetHandle: null },
              id: `handoff-${Date.now()}`,
              label: handoffCondition,
              animated: true,
              style: { stroke: "#6366f1" },
            },
            eds
          )
        );
        toast.success("Handoff created");
      }
    } catch {
      toast.error("Failed to create handoff");
    }

    setHandoffDialog(null);
    setHandoffCondition("");
  };

  const handleAddAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/clusters/${clusterId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setNodes((nds) => [
          ...nds,
          {
            id: agentId,
            position: { x: Math.random() * 500 + 50, y: Math.random() * 300 + 50 },
            data: {
              label: (
                <div className="flex items-center gap-2 px-2">
                  <Bot className="h-4 w-4" />
                  <span>{data.agent?.name || "Agent"}</span>
                </div>
              ),
              agentName: data.agent?.name,
            },
            style: { background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px" },
          },
        ]);
        toast.success("Agent added to cluster");
        setShowPalette(false);
      }
    } catch {
      toast.error("Failed to add agent");
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      await fetch(`/api/clusters/${clusterId}/agents?agent_id=${agentId}&cluster_id=${clusterId}`, { method: "DELETE" });
      setNodes((nds) => nds.filter((n) => n.id !== agentId));
      setEdges((eds) => eds.filter((e) => e.source !== agentId && e.target !== agentId));
      setSelectedNode(null);
      toast.success("Agent removed");
    } catch {
      toast.error("Failed to remove agent");
    }
  };

  const selectedAgent = initialAgents.find((a) => a.agent_id === selectedNode);

  // Filter out agents already in the cluster
  const availableAgents = userAgents.filter((a) => !nodes.find((n) => n.id === a.id));

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>

      <div className="absolute top-4 left-4 z-10">
        <Button onClick={() => setShowPalette(!showPalette)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Agent
        </Button>

        {showPalette && availableAgents.length > 0 && (
          <div className="mt-2 bg-background border rounded-lg shadow-lg p-2 w-64 max-h-64 overflow-auto">
            {availableAgents.map((agent) => (
              <button
                key={agent.id}
                className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                onClick={() => handleAddAgent(agent.id)}
              >
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Handoff creation dialog */}
      <Dialog open={!!handoffDialog} onOpenChange={() => setHandoffDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define Handoff</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Condition</label>
            <Input
              value={handoffCondition}
              onChange={(e) => setHandoffCondition(e.target.value)}
              placeholder='e.g., "When code review is needed"'
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoffDialog(null)}>Cancel</Button>
            <Button onClick={handleCreateHandoff} disabled={!handoffCondition.trim()}>Create Handoff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent detail sheet */}
      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedAgent?.agent.name || "Agent"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {selectedAgent && (
              <>
                <div>
                  <label className="text-sm font-medium">Role in Cluster</label>
                  <Badge variant="outline" className="ml-2">{selectedAgent.role_in_cluster || "No role"}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent.description}</p>
                </div>
                {selectedNode !== managerAgentId && (
                  <Button variant="destructive" size="sm" onClick={() => selectedNode && handleRemoveAgent(selectedNode)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remove from Cluster
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
