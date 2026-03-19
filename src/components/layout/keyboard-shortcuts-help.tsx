"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const shortcuts = [
  { category: "Global", items: [
    { keys: ["Ctrl", "K"], description: "Open search palette" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
  ]},
  { category: "IDE", items: [
    { keys: ["Ctrl", "S"], description: "Save current file" },
    { keys: ["Ctrl", "W"], description: "Close current tab" },
    { keys: ["Ctrl", "Shift", "E"], description: "New skill / file" },
  ]},
  { category: "Navigation", items: [
    { keys: ["↑", "↓"], description: "Navigate search results" },
    { keys: ["Enter"], description: "Open selected result" },
    { keys: ["Esc"], description: "Close dialog / palette" },
  ]},
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "shift+?",
      handler: () => setOpen(true),
      preventDefault: false,
    },
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 text-[11px] font-mono text-muted-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
