import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — Diff two snapshots
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // validate route
  const { searchParams } = new URL(req.url);
  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");

  if (!fromId || !toId) {
    return NextResponse.json({ error: "from and to snapshot IDs required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: fromSnap }, { data: toSnap }] = await Promise.all([
    supabase.from("agent_snapshots").select("*").eq("id", fromId).single(),
    supabase.from("agent_snapshots").select("*").eq("id", toId).single(),
  ]);

  if (!fromSnap || !toSnap) {
    return NextResponse.json({ error: "One or both snapshots not found" }, { status: 404 });
  }

  const fromData = fromSnap.snapshot_data as {
    name: string;
    description: string;
    configuration: Record<string, unknown>;
    files: Record<string, { content: string; type: string; path: string }>;
    memories: { key: string; value: string }[];
  };
  const toData = toSnap.snapshot_data as typeof fromData;

  // Diff metadata
  const metaChanges: { field: string; from: string; to: string }[] = [];
  if (fromData.name !== toData.name) {
    metaChanges.push({ field: "name", from: fromData.name, to: toData.name });
  }
  if (fromData.description !== toData.description) {
    metaChanges.push({ field: "description", from: fromData.description, to: toData.description });
  }
  if (JSON.stringify(fromData.configuration) !== JSON.stringify(toData.configuration)) {
    metaChanges.push({
      field: "configuration",
      from: JSON.stringify(fromData.configuration, null, 2),
      to: JSON.stringify(toData.configuration, null, 2),
    });
  }

  // Diff files
  const allFileNames = new Set([
    ...Object.keys(fromData.files),
    ...Object.keys(toData.files),
  ]);

  const fileDiffs: {
    fileName: string;
    status: "added" | "removed" | "modified" | "unchanged";
    fromContent?: string;
    toContent?: string;
    fromType?: string;
    toType?: string;
  }[] = [];

  for (const fileName of allFileNames) {
    const fromFile = fromData.files[fileName];
    const toFile = toData.files[fileName];

    if (!fromFile && toFile) {
      fileDiffs.push({ fileName, status: "added", toContent: toFile.content, toType: toFile.type });
    } else if (fromFile && !toFile) {
      fileDiffs.push({ fileName, status: "removed", fromContent: fromFile.content, fromType: fromFile.type });
    } else if (fromFile && toFile) {
      if (fromFile.content === toFile.content) {
        fileDiffs.push({ fileName, status: "unchanged" });
      } else {
        fileDiffs.push({
          fileName,
          status: "modified",
          fromContent: fromFile.content,
          toContent: toFile.content,
          fromType: fromFile.type,
          toType: toFile.type,
        });
      }
    }
  }

  // Diff memories
  const fromMemMap = new Map((fromData.memories || []).map((m) => [m.key, m.value]));
  const toMemMap = new Map((toData.memories || []).map((m) => [m.key, m.value]));
  const allMemKeys = new Set([...fromMemMap.keys(), ...toMemMap.keys()]);

  const memoryDiffs: {
    key: string;
    status: "added" | "removed" | "modified" | "unchanged";
    fromValue?: string;
    toValue?: string;
  }[] = [];

  for (const key of allMemKeys) {
    const fromVal = fromMemMap.get(key);
    const toVal = toMemMap.get(key);
    if (fromVal === undefined) {
      memoryDiffs.push({ key, status: "added", toValue: toVal });
    } else if (toVal === undefined) {
      memoryDiffs.push({ key, status: "removed", fromValue: fromVal });
    } else if (fromVal !== toVal) {
      memoryDiffs.push({ key, status: "modified", fromValue: fromVal, toValue: toVal });
    }
  }

  return NextResponse.json({
    from: { id: fromSnap.id, version_label: fromSnap.version_label, created_at: fromSnap.created_at },
    to: { id: toSnap.id, version_label: toSnap.version_label, created_at: toSnap.created_at },
    metaChanges,
    fileDiffs: fileDiffs.filter((d) => d.status !== "unchanged"),
    unchangedFileCount: fileDiffs.filter((d) => d.status === "unchanged").length,
    memoryDiffs: memoryDiffs.filter((d) => d.status !== "unchanged"),
  });
}
