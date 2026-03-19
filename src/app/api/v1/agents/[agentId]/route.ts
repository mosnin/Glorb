import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("*, agent_files(id, file_name, file_path, file_type, size_bytes)")
    .eq("id", agentId)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json(data);
}
