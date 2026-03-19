"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileTree, buildFileTree, type FileNode } from "@/components/ide/file-tree";
import { EditorPanel } from "@/components/ide/editor-panel";
import { EditorTabs, type EditorTab } from "@/components/ide/editor-tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface AgentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

export default function AgentIDEPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agent, setAgent] = useState<{ name: string; description: string } | null>(null);
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // Load agent and files
  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((res) => res.json())
      .then((data) => {
        setAgent({ name: data.name, description: data.description });
        const agentFiles = data.agent_files || [];
        setFiles(agentFiles);
        setFileTree(buildFileTree(agentFiles, data.name));
      });
  }, [agentId]);

  // Load file content
  const loadFileContent = useCallback(
    async (fileId: string) => {
      if (fileContents[fileId]) return;

      const res = await fetch(`/api/agents/${agentId}/files/${fileId}`);
      const data = await res.json();
      setFileContents((prev) => ({ ...prev, [fileId]: data.content || "" }));
    },
    [agentId, fileContents]
  );

  const handleFileSelect = useCallback(
    async (file: FileNode) => {
      if (file.type === "folder") return;

      // Open tab if not already open
      if (!tabs.find((t) => t.id === file.id)) {
        setTabs((prev) => [
          ...prev,
          { id: file.id, name: file.name, path: file.path },
        ]);
      }
      setActiveTabId(file.id);
      await loadFileContent(file.id);
    },
    [tabs, loadFileContent]
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

      // Mark tab as dirty
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: true } : t))
      );

      // Save to server
      try {
        await fetch(`/api/agents/${agentId}/files/${activeTabId}`, {
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
    [activeTabId, agentId]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" render={<Link href={`/agents/${agentId}`} />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-sm">{agent?.name || "Agent"}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {agent?.description}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href={`/api/agents/${agentId}/export`} download />}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
        </Button>
      </div>

      {/* IDE Layout */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* File Tree */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full overflow-auto border-r">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Files
            </div>
            <FileTree
              files={fileTree}
              selectedPath={
                activeTabId
                  ? tabs.find((t) => t.id === activeTabId)?.path || null
                  : null
              }
              onSelect={handleFileSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Editor */}
        <ResizablePanel defaultSize={80}>
          <div className="flex flex-col h-full">
            <EditorTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={setActiveTabId}
              onClose={handleTabClose}
            />
            {activeTabId && fileContents[activeTabId] !== undefined ? (
              <div className="flex-1">
                <EditorPanel
                  content={fileContents[activeTabId]}
                  filePath={
                    tabs.find((t) => t.id === activeTabId)?.path || ""
                  }
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
