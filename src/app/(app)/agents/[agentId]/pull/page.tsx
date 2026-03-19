"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Download, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type Framework = "claude-code" | "cursor" | "python" | "raw";

interface AdapterOutput {
  framework: string;
  files: Record<string, string>;
  instructions: string;
}

const FRAMEWORKS: { id: Framework; label: string; description: string }[] = [
  { id: "claude-code", label: "Claude Code", description: "CLAUDE.md + MCP config + sync hook" },
  { id: "cursor", label: "Cursor", description: ".cursorrules with prompt & skills" },
  { id: "python", label: "Python", description: "glorb_agent.py for Anthropic SDK, LangChain, CrewAI" },
  { id: "raw", label: "Raw JSON", description: "Full glorb.json manifest" },
];

export default function AgentPullPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [framework, setFramework] = useState<Framework>("claude-code");
  const [adapter, setAdapter] = useState<AdapterOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((d) => setAgentName(d.name || "Agent"));
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/agents/${agentId}/adapter?framework=${framework}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load adapter");
        return r.json();
      })
      .then((d) => { setAdapter(d); setLoading(false); })
      .catch(() => {
        toast.error("Failed to generate adapter. Make sure you have an API key.");
        setLoading(false);
      });
  }, [agentId, framework]);

  async function copyToClipboard(content: string, filename: string) {
    await navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
    toast.success(`Copied ${filename}`);
  }

  async function downloadAll() {
    if (!adapter) return;
    // Download each file
    for (const [filename, content] of Object.entries(adapter.files)) {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("Files downloaded");
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/agents/${agentId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pull {agentName}</h1>
          <p className="text-muted-foreground mt-1">
            Generate framework-specific files to use this agent anywhere.
          </p>
        </div>
      </div>

      {/* Framework selector */}
      <Tabs value={framework} onValueChange={(v) => setFramework(v as Framework)}>
        <TabsList>
          {FRAMEWORKS.map((fw) => (
            <TabsTrigger key={fw.id} value={fw.id}>
              {fw.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FRAMEWORKS.map((fw) => (
          <TabsContent key={fw.id} value={fw.id}>
            <p className="text-sm text-muted-foreground mb-4">{fw.description}</p>
          </TabsContent>
        ))}
      </Tabs>

      {/* CLI shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Quick Setup via CLI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted p-3 rounded font-mono">
              glorb init {framework} {agentId}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(`glorb init ${framework} ${agentId}`, "CLI command")}
            >
              {copiedFile === "CLI command" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated files */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : adapter ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Files</h2>
            <Button variant="outline" size="sm" onClick={downloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          <div className="space-y-4">
            {Object.entries(adapter.files).map(([filename, content]) => (
              <Card key={filename}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-medium">{filename}</code>
                      <Badge variant="outline" className="text-xs">
                        {(content.length / 1024).toFixed(1)}KB
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(content, filename)}
                    >
                      {copiedFile === filename ? (
                        <><Check className="h-3 w-3 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                    {content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Setup instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="text-xs whitespace-pre-wrap">{adapter.instructions}</pre>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
