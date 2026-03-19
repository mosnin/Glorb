import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — Get snapshot detail (with full data)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; snapshotId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { snapshotId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  return NextResponse.json(data);
}

// POST — Rollback agent to this snapshot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; snapshotId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, snapshotId } = await params;
  const supabase = createAdminSupabaseClient();

  // Load the snapshot
  const { data: snapshot, error: snapError } = await supabase
    .from("agent_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (snapError || !snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const snapData = snapshot.snapshot_data as {
    name: string;
    description: string;
    configuration: Record<string, unknown>;
    files: Record<string, { content: string; type: string; path: string }>;
    memories: { key: string; value: string }[];
  };

  // Update agent metadata
  await supabase
    .from("agents")
    .update({
      name: snapData.name,
      description: snapData.description,
      configuration: snapData.configuration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  // Restore files: delete existing, re-upload from snapshot
  const { data: existingFiles } = await supabase
    .from("agent_files")
    .select("id, storage_path")
    .eq("agent_id", agentId);

  // Delete existing files from storage
  if (existingFiles?.length) {
    const paths = existingFiles.map((f) => f.storage_path);
    await supabase.storage.from("agent-files").remove(paths);
    await supabase
      .from("agent_files")
      .delete()
      .eq("agent_id", agentId);
  }

  // Re-upload snapshot files
  for (const [fileName, fileData] of Object.entries(snapData.files)) {
    const storagePath = `${userId}/agents/${agentId}/${fileData.path}`;
    const blob = new Blob([fileData.content], { type: "text/plain" });

    await supabase.storage
      .from("agent-files")
      .upload(storagePath, blob, { upsert: true });

    await supabase.from("agent_files").insert({
      agent_id: agentId,
      file_name: fileName,
      file_path: fileData.path,
      file_type: fileData.type,
      storage_path: storagePath,
      mime_type: "text/plain",
      size_bytes: fileData.content.length,
    });
  }

  // Restore memories
  await supabase.from("agent_memories").delete().eq("agent_id", agentId);
  if (snapData.memories?.length) {
    await supabase.from("agent_memories").insert(
      snapData.memories.map((m) => ({
        agent_id: agentId,
        user_id: userId,
        key: m.key,
        value: m.value,
      }))
    );
  }

  return NextResponse.json({ rolled_back_to: snapshot.version_label });
}
