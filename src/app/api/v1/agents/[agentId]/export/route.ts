import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createAgentZip } from "@/lib/export/zip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;

  try {
    const zip = await createAgentZip(agentId);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="agent-${agentId}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
}
