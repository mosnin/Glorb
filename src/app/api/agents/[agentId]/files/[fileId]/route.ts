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

  const { data: file, error } = await supabase
    .from("agent_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Fetch content from storage
  const { data: blob, error: storageError } = await supabase.storage
    .from("agent-files")
    .download(file.storage_path);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const content = await blob.text();

  return NextResponse.json({ ...file, content });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  // Get existing file
  const { data: file } = await supabase
    .from("agent_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Update content in storage if provided
  if (body.content !== undefined) {
    const { error: storageError } = await supabase.storage
      .from("agent-files")
      .upload(file.storage_path, new Blob([body.content], { type: "text/plain" }), {
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.file_name) updateData.file_name = body.file_name;
  if (body.content !== undefined) {
    updateData.size_bytes = new Blob([body.content]).size;
  }

  const { data, error } = await supabase
    .from("agent_files")
    .update(updateData)
    .eq("id", fileId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;
  const supabase = await createServerSupabaseClient();

  // Get file to delete from storage
  const { data: file } = await supabase
    .from("agent_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (file) {
    await supabase.storage.from("agent-files").remove([file.storage_path]);
  }

  const { error } = await supabase
    .from("agent_files")
    .delete()
    .eq("id", fileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
