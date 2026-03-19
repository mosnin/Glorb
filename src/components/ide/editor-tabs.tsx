"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  isDirty?: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

export function EditorTabs({
  tabs,
  activeTabId,
  onSelect,
  onClose,
}: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex border-b bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs border-r cursor-pointer hover:bg-accent/50 shrink-0",
            tab.id === activeTabId && "bg-background border-b-0"
          )}
          onClick={() => onSelect(tab.id)}
        >
          <span className="truncate max-w-[120px]">
            {tab.isDirty && <span className="text-primary mr-0.5">*</span>}
            {tab.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
