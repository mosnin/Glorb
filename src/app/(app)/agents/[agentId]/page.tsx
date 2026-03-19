"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Code, Download, FileText, ArrowLeft, Play, FlaskConical, Globe, Plug, BarChart3, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentRunner } from "@/components/agents/agent-runner";
import { TestSandbox } from "@/components/agents/test-sandbox";
import { PublishDialog } from "@/components/agents/publish-dialog";
import { MemoryPanel } from "@/components/agents/memory-panel";
import { ScheduleManager } from "@/components/agents/schedule-manager";
import { CollaboratorPanel } from "@/components/agents/collaborator-panel";
import { RunHistory } from "@/components/agents/run-history";
import { SyncDashboard } from "@/components/agents/sync-dashboard";
import { SecretsPanel } from "@/components/agents/secrets-panel";
import { SnapshotManager } from "@/components/agents/snapshot-manager";
import { HealthMonitor } from "@/components/agents/health-monitor";
import { AlertManager } from "@/components/agents/alert-manager";
import { SnapshotDiff } from "@/components/agents/snapshot-diff";

interface AgentDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  configuration: Record<string, unknown>;
  agent_files: { id: string; file_name: string; file_path: string; file_type: string }[];
  created_at: string;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [cloning, setCloning] = useState(false);

  const handleClone = async () => {
    setCloning(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/clone`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cloned as "${data.name}"`);
        router.push(`/agents/${data.id}`);
      } else {
        toast.error("Clone failed");
      }
    } finally {
      setCloning(false);
    }
  };

  const loadAgent = () => {
    fetch(`/api/agents/${agentId}`)
      .then((res) => res.json())
      .then(setAgent);
  };

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/agents" />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <Badge variant={agent.status === "published" ? "default" : "secondary"}>
              {agent.status}
            </Badge>
          </div>
          {agent.description && (
            <p className="text-muted-foreground mt-1">{agent.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {agent.status !== "published" && (
            <Button variant="outline" onClick={() => setShowPublish(true)}>
              <Globe className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
          <Button render={<Link href={`/agents/${agentId}/ide`} />}>
              <Code className="h-4 w-4 mr-2" />
              Open IDE
          </Button>
          <Button variant="outline" render={<Link href={`/agents/${agentId}/analytics`} />}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
          </Button>
          <Button variant="outline" render={<Link href={`/agents/${agentId}/pull`} />}>
              <Plug className="h-4 w-4 mr-2" />
              Pull
          </Button>
          <Button variant="outline" onClick={handleClone} disabled={cloning}>
              <Copy className="h-4 w-4 mr-2" />
              {cloning ? "Cloning..." : "Clone"}
          </Button>
          <Button variant="outline" render={<a href={`/api/agents/${agentId}/export`} download />}>
              <Download className="h-4 w-4 mr-2" />
              Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AgentRunner agentId={agentId} />
        </CardContent>
      </Card>

      <RunHistory agentId={agentId} />

      <TestSandbox agentId={agentId} />

      <div className="grid gap-4 md:grid-cols-2">
        <ScheduleManager agentId={agentId} />
        <CollaboratorPanel agentId={agentId} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <HealthMonitor agentId={agentId} />
        <div className="space-y-4">
          <SnapshotManager agentId={agentId} onRollback={loadAgent} />
          <Button variant="outline" size="sm" onClick={() => setShowDiff(true)} className="w-full">
            Compare Snapshots
          </Button>
        </div>
      </div>

      <SyncDashboard agentId={agentId} />

      <AlertManager agentId={agentId} />

      <MemoryPanel agentId={agentId} />

      <SecretsPanel agentId={agentId} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agent.agent_files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{file.file_path}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {file.file_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(agent.configuration, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
      <PublishDialog
        entityType="agent"
        entityId={agentId}
        entityName={agent.name}
        open={showPublish}
        onOpenChange={setShowPublish}
        onPublished={loadAgent}
      />
      <SnapshotDiff
        agentId={agentId}
        open={showDiff}
        onOpenChange={setShowDiff}
      />
    </div>
  );
}
