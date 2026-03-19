import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
