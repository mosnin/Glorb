"use client";

import { useEffect, useRef } from "react";

interface Shortcut {
  /** e.g. "ctrl+s", "ctrl+shift+p", "ctrl+w" */
  key: string;
  handler: () => void;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
}

function parseShortcut(key: string) {
  const parts = key.toLowerCase().split("+");
  return {
    ctrl: parts.includes("ctrl") || parts.includes("cmd"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts.filter((p) => !["ctrl", "cmd", "shift", "alt"].includes(p))[0],
  };
}

/**
 * Register keyboard shortcuts. Automatically cleans up on unmount.
 * Supports Ctrl/Cmd modifier (matches both for cross-platform).
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: "ctrl+s", handler: () => saveFile() },
 *   { key: "ctrl+w", handler: () => closeTab() },
 *   { key: "ctrl+shift+p", handler: () => openCommandPalette() },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcutsRef.current) {
        const parsed = parseShortcut(shortcut.key);
        const ctrlMatch = parsed.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = parsed.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = parsed.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === parsed.key;

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
