import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  // Load source agent
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*, agent_files(*)")
    .eq("id", agentId)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Create cloned agent
  const { data: cloned, error: cloneError } = await supabase
    .from("agents")
    .insert({
      user_id: userId,
      name: `${agent.name} (Copy)`,
      description: agent.description,
      status: "draft",
      configuration: agent.configuration,
    })
    .select()
    .single();

  if (cloneError || !cloned) {
    return NextResponse.json({ error: "Failed to clone agent" }, { status: 500 });
  }

  // Clone files
  for (const file of agent.agent_files || []) {
    // Download original file from storage
    const { data: blob } = await adminSupabase.storage
      .from("agent-files")
      .download(file.storage_path);

    if (!blob) continue;

    const newStoragePath = `${userId}/${cloned.id}/${file.file_path}`;

    // Upload to new location
    await adminSupabase.storage
      .from("agent-files")
      .upload(newStoragePath, blob, { contentType: "text/plain" });

    // Create file record
    await adminSupabase.from("agent_files").insert({
      agent_id: cloned.id,
      file_name: file.file_name,
      file_path: file.file_path,
      file_type: file.file_type,
      storage_path: newStoragePath,
      size_bytes: file.size_bytes,
    });
  }

  return NextResponse.json({ id: cloned.id, name: cloned.name }, { status: 201 });
}
