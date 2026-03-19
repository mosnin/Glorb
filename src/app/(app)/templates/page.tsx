"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, Network, Star, GitFork, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Template {
  id: string;
  type: "agent" | "cluster";
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  is_featured: boolean;
  use_count: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "cluster">("all");
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkDialog, setForkDialog] = useState<Template | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);

    fetch(`/api/templates?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [typeFilter, search]);

  async function handleFork(template: Template) {
    setForkingId(template.id);
    try {
      const res = await fetch(`/api/templates/${template.id}/fork`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setForkDialog(null);
        router.push(data.type === "agent" ? `/agents/${data.id}` : `/clusters/${data.id}`);
      }
    } finally {
      setForkingId(null);
    }
  }

  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-1">Pre-built agents and clusters you can fork into your workspace</p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "agent", "cluster"] as const).map((t) => (
            <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All" : t === "agent" ? "Agents" : "Clusters"}
            </Button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="cursor-default">{cat}</Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{search ? "No templates match your search." : "No templates available yet."}</p>
          <p className="text-sm text-muted-foreground mt-1">Templates will appear here as they&apos;re added to the library.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {template.type === "agent" ? <Bot className="h-4 w-4 text-muted-foreground" /> : <Network className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  {template.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>}
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">{template.type}</Badge>
                  <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                  {template.tags?.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{template.use_count} {template.use_count === 1 ? "fork" : "forks"}</span>
                  <Button size="sm" onClick={() => setForkDialog(template)}>
                    <GitFork className="h-3.5 w-3.5 mr-1.5" />
                    Fork
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!forkDialog} onOpenChange={() => setForkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Template</DialogTitle>
            <DialogDescription>
              This will create a new {forkDialog?.type} in your workspace based on &quot;{forkDialog?.name}&quot;. You can customize it after forking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForkDialog(null)}>Cancel</Button>
            <Button onClick={() => forkDialog && handleFork(forkDialog)} disabled={forkingId === forkDialog?.id}>
              {forkingId === forkDialog?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitFork className="h-4 w-4 mr-2" />}
              Fork to My Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
