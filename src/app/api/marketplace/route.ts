import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured");

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("marketplace_listings")
    .select("*")
    .order("use_count", { ascending: false });

  if (type && type !== "all") query = query.eq("entity_type", type);
  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.eq("is_featured", true);
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
