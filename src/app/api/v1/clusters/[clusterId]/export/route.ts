import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { createClusterZip } from "@/lib/export/zip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

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
