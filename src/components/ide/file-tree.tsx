"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FileCode,
  FileJson,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  fileType?: string;
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  selectedPath: string | null;
  onSelect: (file: FileNode) => void;
}

function getFileIcon(name: string) {
  if (name.endsWith(".json")) return FileJson;
  if (name.endsWith(".md")) return FileText;
  return FileCode;
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: FileNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;

  const Icon = isFolder ? Folder : getFileIcon(node.name);

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen);
          } else {
            onSelect(node);
          }
        }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm hover:bg-accent rounded-sm",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder && (
          isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        )}
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div className="py-2">
      {files.map((file) => (
        <FileTreeItem
          key={file.path}
          node={file}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// Utility to build tree from flat file list
export function buildFileTree(
  files: { id: string; file_name: string; file_path: string; file_type: string }[],
  rootName: string
): FileNode[] {
  const root: FileNode = {
    id: "root",
    name: rootName,
    path: "",
    type: "folder",
    children: [],
  };

  for (const file of files) {
    const parts = file.file_path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      if (isFile) {
        current.children!.push({
          id: file.id,
          name: part,
          path,
          type: "file",
          fileType: file.file_type,
        });
      } else {
        let folder = current.children!.find(
          (c) => c.name === part && c.type === "folder"
        );
        if (!folder) {
          folder = {
            id: `folder-${path}`,
            name: part,
            path,
            type: "folder",
            children: [],
          };
          current.children!.push(folder);
        }
        current = folder;
      }
    }
  }

  return [root];
}
