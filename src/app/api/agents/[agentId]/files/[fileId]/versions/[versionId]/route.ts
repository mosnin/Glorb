import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET version content
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string; versionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { versionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: version } = await supabase
    .from("file_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const { data: blob } = await supabase.storage
    .from("agent-files")
    .download(version.storage_path);

  if (!blob) return NextResponse.json({ error: "Version content not found" }, { status: 404 });

  const content = await blob.text();
  return NextResponse.json({ ...version, content });
}

// POST to rollback (restore this version as the current file content)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string; versionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, fileId, versionId } = await params;
  const supabase = await createServerSupabaseClient();

  // Get the version to restore
  const { data: version } = await supabase
    .from("file_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Download version content
  const { data: blob } = await supabase.storage
    .from("agent-files")
    .download(version.storage_path);

  if (!blob) return NextResponse.json({ error: "Version content not found" }, { status: 404 });

  // Get current file
  const { data: file } = await supabase
    .from("agent_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // First, snapshot the current state as a new version
  const { data: currentBlob } = await supabase.storage
    .from("agent-files")
    .download(file.storage_path);

  if (currentBlob) {
    const { data: lastVersion } = await supabase
      .from("file_versions")
      .select("version_number")
      .eq("file_id", fileId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number || 0) + 1;
    const versionPath = `${userId}/agents/${agentId}/versions/${fileId}/v${nextVersion}`;

    await supabase.storage.from("agent-files").upload(versionPath, currentBlob, { upsert: true });
    await supabase.from("file_versions").insert({
      agent_id: agentId,
      file_id: fileId,
      version_number: nextVersion,
      storage_path: versionPath,
      size_bytes: file.size_bytes,
      change_source: "manual",
      change_summary: `Auto-saved before rollback to v${version.version_number}`,
      created_by: userId,
    });
  }

  // Overwrite current file with version content
  const { error: uploadError } = await supabase.storage
    .from("agent-files")
    .upload(file.storage_path, blob, { upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Update file metadata
  await supabase
    .from("agent_files")
    .update({
      size_bytes: version.size_bytes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId);

  return NextResponse.json({ success: true, restored_version: version.version_number });
}
