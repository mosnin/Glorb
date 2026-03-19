import { NextRequest, NextResponse } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { buildAgentManifest } from "@/lib/manifest";
import { generateAdapter, type Framework } from "@/lib/adapters";

const VALID_FRAMEWORKS: Framework[] = ["claude-code", "cursor", "python", "raw"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const framework = (searchParams.get("framework") || "raw") as Framework;

  if (!VALID_FRAMEWORKS.includes(framework)) {
    return NextResponse.json(
      { error: `Invalid framework. Must be one of: ${VALID_FRAMEWORKS.join(", ")}` },
      { status: 400 }
    );
  }

  const baseUrl = new URL(req.url).origin;
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "") || "";

  try {
    const manifest = await buildAgentManifest(agentId, userId, baseUrl);
    const adapter = generateAdapter(manifest, framework, apiKey, baseUrl);
    return NextResponse.json(adapter);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate adapter" },
      { status: 404 }
    );
  }
}
