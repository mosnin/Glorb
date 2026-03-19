import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { entity_type, agent_id, cluster_id, category, tags } = body;

  if (!entity_type || (entity_type === "agent" && !agent_id) || (entity_type === "cluster" && !cluster_id)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify ownership and get entity details
  const entityId = entity_type === "agent" ? agent_id : cluster_id;
  const table = entity_type === "agent" ? "agents" : "clusters";

  const { data: entity } = await supabase
    .from(table)
    .select("id, name, description, user_id")
    .eq("id", entityId)
    .eq("user_id", userId)
    .single();

  if (!entity) return NextResponse.json({ error: "Entity not found or not owned by you" }, { status: 404 });

  // Check if already listed
  const existingQuery = supabase.from("marketplace_listings").select("id");
  if (entity_type === "agent") existingQuery.eq("agent_id", agent_id);
  else existingQuery.eq("cluster_id", cluster_id);
  const { data: existing } = await existingQuery.single();

  if (existing) return NextResponse.json({ error: "Already published" }, { status: 409 });

  // Update entity status to published
  await supabase.from(table).update({ status: "published" }).eq("id", entityId);

  // Create listing
  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      user_id: userId,
      entity_type,
      agent_id: entity_type === "agent" ? agent_id : null,
      cluster_id: entity_type === "cluster" ? cluster_id : null,
      name: entity.name,
      description: entity.description,
      category: category || "general",
      tags: tags || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(listing, { status: 201 });
}
