import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { buildClusterManifest } from "@/lib/manifest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const baseUrl = new URL(req.url).origin;

  try {
    const manifest = await buildClusterManifest(clusterId, userId, baseUrl);
    return NextResponse.json(manifest);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build manifest" },
      { status: 404 }
    );
  }
}
