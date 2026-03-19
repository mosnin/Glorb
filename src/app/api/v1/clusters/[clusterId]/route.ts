import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { clusterId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("clusters")
    .select("*, cluster_agents(*, agent:agents(id, name, description)), cluster_files(id, file_name, file_path, file_type)")
    .eq("id", clusterId)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  return NextResponse.json(data);
}
