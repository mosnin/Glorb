import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("file_versions")
    .select("*")
    .eq("file_id", fileId)
    .order("version_number", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, fileId } = await params;
  const { change_source, change_summary } = await req.json();
  const supabase = await createServerSupabaseClient();

  // Get current file
  const { data: file } = await supabase
    .from("agent_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Get current content from storage
  const { data: blob } = await supabase.storage
    .from("agent-files")
    .download(file.storage_path);

  if (!blob) return NextResponse.json({ error: "File content not found" }, { status: 404 });

  // Get next version number
  const { data: lastVersion } = await supabase
    .from("file_versions")
    .select("version_number")
    .eq("file_id", fileId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (lastVersion?.version_number || 0) + 1;

  // Store snapshot
  const versionPath = `${userId}/agents/${agentId}/versions/${fileId}/v${nextVersion}`;
  const { error: storageError } = await supabase.storage
    .from("agent-files")
    .upload(versionPath, blob, { upsert: true });

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  const { data: version, error } = await supabase
    .from("file_versions")
    .insert({
      agent_id: agentId,
      file_id: fileId,
      version_number: nextVersion,
      storage_path: versionPath,
      size_bytes: file.size_bytes,
      change_source: change_source || "manual",
      change_summary: change_summary || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(version, { status: 201 });
}
