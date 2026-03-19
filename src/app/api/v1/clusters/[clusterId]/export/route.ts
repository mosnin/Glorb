import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { createClusterZip } from "@/lib/export/zip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;

  try {
    const zip = await createClusterZip(clusterId);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cluster-${clusterId}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }
}
