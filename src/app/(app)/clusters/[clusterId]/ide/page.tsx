"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileTree, type FileNode } from "@/components/ide/file-tree";
import { EditorPanel } from "@/components/ide/editor-panel";
import { EditorTabs, type EditorTab } from "@/components/ide/editor-tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ClusterIDEPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const [cluster, setCluster] = useState<{ name: string } | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileSource, setFileSource] = useState<Record<string, { type: "cluster" | "agent"; entityId: string }>>({});

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((res) => res.json())
      .then((data) => {
        setCluster({ name: data.name });

        // Build unified file tree from cluster files + agent files
        const root: FileNode = {
          id: "root",
          name: data.name,
          path: "",
          type: "folder",
          children: [],
        };

        // Cluster-level files
        for (const f of data.cluster_files || []) {
          root.children!.push({
            id: f.id,
            name: f.file_name,
            path: f.file_path,
            type: "file",
            fileType: f.file_type,
          });
          setFileSource((prev) => ({
            ...prev,
            [f.id]: { type: "cluster", entityId: clusterId },
          }));
        }

        // Agent folders
        const agentsFolder: FileNode = {
          id: "agents-folder",
          name: "agents",
          path: "agents",
          type: "folder",
          children: [],
        };

        for (const ca of data.cluster_agents || []) {
          const agent = ca.agent;
          if (!agent) continue;

          const agentFolder: FileNode = {
            id: `agent-${agent.id}`,
            name: agent.name,
            path: `agents/${agent.name}`,
            type: "folder",
            children: [],
          };

          // Load agent files
          fetch(`/api/agents/${agent.id}/files`)
            .then((res) => res.json())
            .then((files) => {
              for (const f of files) {
                agentFolder.children!.push({
                  id: f.id,
                  name: f.file_name,
                  path: `agents/${agent.name}/${f.file_path}`,
                  type: "file",
                  fileType: f.file_type,
                });
                setFileSource((prev) => ({
                  ...prev,
                  [f.id]: { type: "agent", entityId: agent.id },
                }));
              }
              setFileTree([{ ...root }]);
            });

          agentsFolder.children!.push(agentFolder);
        }

        if (agentsFolder.children!.length > 0) {
          root.children!.push(agentsFolder);
        }

        setFileTree([root]);
      });
  }, [clusterId]);

  const handleFileSelect = useCallback(
    async (file: FileNode) => {
      if (file.type === "folder") return;

      if (!tabs.find((t) => t.id === file.id)) {
        setTabs((prev) => [...prev, { id: file.id, name: file.name, path: file.path }]);
      }
      setActiveTabId(file.id);

      if (!fileContents[file.id]) {
        const source = fileSource[file.id];
        if (source) {
          const endpoint =
            source.type === "cluster"
              ? `/api/clusters/${source.entityId}/files/${file.id}`
              : `/api/agents/${source.entityId}/files/${file.id}`;
          const res = await fetch(endpoint);
          const data = await res.json();
          setFileContents((prev) => ({ ...prev, [file.id]: data.content || "" }));
        }
      }
    },
    [tabs, fileContents, fileSource]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        setActiveTabId(tabs.length > 1 ? tabs[tabs.length - 2]?.id : null);
      }
    },
    [activeTabId, tabs]
  );

  const handleContentChange = useCallback(
    async (content: string) => {
      if (!activeTabId) return;
      setFileContents((prev) => ({ ...prev, [activeTabId]: content }));
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: true } : t))
      );

      const source = fileSource[activeTabId];
      if (!source) return;

      try {
        const endpoint =
          source.type === "cluster"
            ? `/api/clusters/${source.entityId}/files/${activeTabId}`
            : `/api/agents/${source.entityId}/files/${activeTabId}`;

        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
        );
      } catch {
        toast.error("Failed to save file");
      }
    },
    [activeTabId, fileSource]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" render={<Link href={`/clusters/${clusterId}`} />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-sm">{cluster?.name || "Cluster"} — IDE</h1>
        </div>
        <Button variant="outline" size="sm" render={<a href={`/api/clusters/${clusterId}/export`} download />}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
        </Button>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full overflow-auto border-r">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Files
            </div>
            <FileTree
              files={fileTree}
              selectedPath={activeTabId ? tabs.find((t) => t.id === activeTabId)?.path || null : null}
              onSelect={handleFileSelect}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={80}>
          <div className="flex flex-col h-full">
            <EditorTabs tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={handleTabClose} />
            {activeTabId && fileContents[activeTabId] !== undefined ? (
              <div className="flex-1">
                <EditorPanel
                  content={fileContents[activeTabId]}
                  filePath={tabs.find((t) => t.id === activeTabId)?.path || ""}
                  onChange={handleContentChange}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a file to edit
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
