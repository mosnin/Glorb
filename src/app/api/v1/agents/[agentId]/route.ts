import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

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
