import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET — List snapshots for an agent
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_snapshots")
    .select("id, version_label, trigger, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Create a snapshot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();
  const { version_label, trigger } = body;

  const supabase = createAdminSupabaseClient();

  // Build snapshot: agent config + all file contents
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*, agent_files(*)")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Load file contents from storage
  const files: Record<string, { content: string; type: string; path: string }> = {};
  for (const file of agent.agent_files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storage_path);
    files[file.file_name] = {
      content: blob ? await blob.text() : "",
      type: file.file_type,
      path: file.file_path,
    };
  }

  // Load memories
  const { data: memories } = await supabase
    .from("agent_memories")
    .select("key, value")
    .eq("agent_id", agentId);

  const snapshotData = {
    name: agent.name,
    description: agent.description,
    status: agent.status,
    configuration: agent.configuration,
    files,
    memories: memories || [],
  };

  // Count existing snapshots for auto-labeling
  const { count } = await supabase
    .from("agent_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  const label = version_label || `v${(count || 0) + 1}`;

  const { data, error } = await supabase
    .from("agent_snapshots")
    .insert({
      agent_id: agentId,
      user_id: userId,
      version_label: label,
      trigger: trigger || "manual",
      snapshot_data: snapshotData,
    })
    .select("id, version_label, trigger, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
