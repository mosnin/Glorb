import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// PATCH — Update directive status (acknowledge, complete, fail)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; directiveId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;

  const { agentId, directiveId } = await params;
  const body = await req.json();

  const { status, result } = body;

  if (!status || !["delivered", "in_progress", "completed", "failed"].includes(status)) {
    return NextResponse.json({
      error: "status must be: delivered, in_progress, completed, or failed",
    }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const update: Record<string, unknown> = { status };
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  if (status === "completed") {
    update.completed_at = new Date().toISOString();
    if (result) update.result = result;
  }
  if (status === "failed") {
    update.completed_at = new Date().toISOString();
    if (result) update.result = result;
  }

  const { data, error } = await supabase
    .from("agent_directives")
    .update(update)
    .eq("id", directiveId)
    .eq("agent_id", agentId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
