"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SkillBuilderDialogProps {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function SkillBuilderDialog({ agentId, open, onOpenChange, onCreated }: SkillBuilderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parameters, setParameters] = useState(`{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query"
    }
  },
  "required": ["query"]
}`);
  const [saving, setSaving] = useState(false);

  const skillJson = {
    name: name || "tool_name",
    description: description || "Tool description",
    input_schema: (() => {
      try { return JSON.parse(parameters); } catch { return {}; }
    })(),
  };

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }

    try {
      JSON.parse(parameters);
    } catch {
      toast.error("Invalid JSON in parameters schema");
      return;
    }

    setSaving(true);
    try {
      // Create the skill file via the files API
      const formData = new FormData();
      const blob = new Blob([JSON.stringify(skillJson, null, 2)], { type: "application/json" });
      formData.append("file", blob, `${name}.json`);
      formData.append("file_path", `skills/${name}.json`);
      formData.append("file_type", "skill");

      const res = await fetch(`/api/agents/${agentId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create skill");

      toast.success(`Skill "${name}" created`);
      onOpenChange(false);
      setName("");
      setDescription("");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Skill (Claude Tool Format)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tool Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/g, ""))}
              placeholder="search_web"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Search the web for information"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Input Schema (JSON)</label>
            <Textarea
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              className="font-mono text-xs min-h-[150px]"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Preview</label>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
              {JSON.stringify(skillJson, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
