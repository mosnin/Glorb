import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Unpublish / delete listing
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listingId } = await params;
  const supabase = await createServerSupabaseClient();

  // Get listing to find the entity
  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("id", listingId)
    .eq("user_id", userId)
    .single();

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Revert entity status to draft
  const table = listing.entity_type === "agent" ? "agents" : "clusters";
  const entityId = listing.agent_id || listing.cluster_id;
  await supabase.from(table).update({ status: "draft" }).eq("id", entityId);

  // Delete listing
  const { error } = await supabase
    .from("marketplace_listings")
    .delete()
    .eq("id", listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
