import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClusterZip } from "@/lib/export/zip";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: cluster } = await supabase
    .from("clusters")
    .select("name")
    .eq("id", clusterId)
    .single();

  if (!cluster) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });

  const zipBuffer = await createClusterZip(clusterId);

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${cluster.name}.zip"`,
    },
  });
}
