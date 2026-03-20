"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, Network, FileText, BarChart3, Settings, MessageSquare, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface SearchResult {
  id: string;
  type: "agent" | "cluster" | "page";
  name: string;
  description?: string;
  href: string;
}

const STATIC_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", name: "Dashboard", description: "Overview and metrics", href: "/dashboard" },
  { id: "chat", type: "page", name: "Chat", description: "Build agents via conversation", href: "/chat" },
  { id: "agents", type: "page", name: "Agents", description: "Manage your agents", href: "/agents" },
  { id: "clusters", type: "page", name: "Clusters", description: "Multi-agent architectures", href: "/clusters" },
  { id: "marketplace", type: "page", name: "Marketplace", description: "Discover community agents", href: "/marketplace" },
  { id: "analytics", type: "page", name: "Analytics", description: "Usage and cost analytics", href: "/analytics" },
  { id: "settings", type: "page", name: "Settings", description: "API keys, webhooks, workspace", href: "/settings" },
  { id: "templates", type: "page", name: "Templates", description: "Agent and cluster templates", href: "/templates" },
];

const typeIcons = {
  agent: Bot,
  cluster: Network,
  page: FileText,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agents, setAgents] = useState<SearchResult[]>([]);
  const [clusters, setClusters] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load agents and clusters for search
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/agents").then((r) => r.ok ? r.json() : []),
      fetch("/api/clusters").then((r) => r.ok ? r.json() : []),
    ]).then(([agentData, clusterData]) => {
      setAgents(
        (agentData || []).map((a: { id: string; name: string; description?: string }) => ({
          id: a.id,
          type: "agent" as const,
          name: a.name,
          description: a.description,
          href: `/agents/${a.id}`,
        }))
      );
      setClusters(
        (clusterData || []).map((c: { id: string; name: string; description?: string }) => ({
          id: c.id,
          type: "cluster" as const,
          name: c.name,
          description: c.description,
          href: `/clusters/${c.id}`,
        }))
      );
    });
  }, [open]);

  // Filter results
  useEffect(() => {
    const q = query.toLowerCase().trim();
    const all = [...agents, ...clusters, ...STATIC_PAGES];
    if (!q) {
      setResults(all.slice(0, 10));
    } else {
      setResults(
        all
          .filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.description?.toLowerCase().includes(q) ||
              r.type.includes(q)
          )
          .slice(0, 10)
      );
    }
    setSelectedIndex(0);
  }, [query, agents, clusters]);

  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      router.push(result.href);
    },
    [router]
  );

  useKeyboardShortcuts([
    {
      key: "ctrl+k",
      handler: () => setOpen((prev) => !prev),
    },
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-hidden" showCloseButton={false}>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, clusters, pages..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            results.map((result, i) => {
              const Icon = typeIcons[result.type];
              return (
                <button
                  key={result.id}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  }`}
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.name}</div>
                    {result.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground shrink-0">
                    {result.type}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Open</span>
          <span><kbd className="font-mono">esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
