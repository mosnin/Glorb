import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAgentZip } from "@/lib/export/zip";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;

  // Verify ownership
  const supabase = await createServerSupabaseClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("name")
    .eq("id", agentId)
    .single();

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const zipBuffer = await createAgentZip(agentId);

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${agent.name}.zip"`,
    },
  });
}
