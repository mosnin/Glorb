import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";

// GET — List agent files with metadata (no content, use ?include_content=true for content)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;

  const { agentId } = await params;
  const includeContent = new URL(req.url).searchParams.get("include_content") === "true";
  const supabase = createAdminSupabaseClient();

  const { data: files, error } = await supabase
    .from("agent_files")
    .select("id, file_name, file_path, file_type, storage_path, size_bytes")
    .eq("agent_id", agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!includeContent) {
    return NextResponse.json(files || []);
  }

  // Download content for each file
  const withContent = [];
  for (const file of files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storage_path);
    withContent.push({
      ...file,
      content: blob ? await blob.text() : "",
    });
  }

  return NextResponse.json(withContent);
}

// PUT — Create or update an agent file from external runtime
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const body = await req.json();

  const { file_path, content, file_type } = body;
  if (!file_path || content === undefined) {
    return NextResponse.json({ error: "file_path and content required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Determine file name from path
  const fileName = file_path.split("/").pop() || file_path;
  const storagePath = `${userId}/${agentId}/${file_path}`;
  const contentBlob = new Blob([content], { type: "text/plain" });

  // Upload to storage (overwrite if exists)
  const { error: uploadError } = await supabase.storage
    .from("agent-files")
    .upload(storagePath, contentBlob, {
      upsert: true,
      contentType: "text/plain",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Upsert file record
  const { data, error } = await supabase
    .from("agent_files")
    .upsert(
      {
        agent_id: agentId,
        file_name: fileName,
        file_path,
        file_type: file_type || inferFileType(file_path),
        storage_path: storagePath,
        size_bytes: new TextEncoder().encode(content).length,
      },
      { onConflict: "agent_id,file_path" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update agent timestamp
  await supabase
    .from("agents")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", agentId);

  // Fire webhook
  dispatchWebhook(userId, "agent.file.updated", {
    agent_id: agentId,
    file_path,
    file_type: data.file_type,
    size_bytes: data.size_bytes,
  }).catch(() => {});

  return NextResponse.json(data, { status: 200 });
}

function inferFileType(filePath: string): string {
  if (filePath === "prompt.md" || filePath.includes("prompt")) return "prompt";
  if (filePath === "role.md" || filePath.includes("role")) return "role";
  if (filePath.endsWith(".json") && filePath.includes("skill")) return "skill";
  if (filePath.endsWith(".md")) return "doc";
  if (filePath.endsWith(".py")) return "code";
  if (filePath.endsWith(".ts") || filePath.endsWith(".js")) return "code";
  return "file";
}
