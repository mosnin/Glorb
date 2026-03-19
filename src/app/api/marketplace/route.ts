import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "24");
  const offset = (page - 1) * pageSize;

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("marketplace_listings")
    .select("*", { count: "exact" })
    .order("use_count", { ascending: false });

  if (type && type !== "all") query = query.eq("entity_type", type);
  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.eq("is_featured", true);
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data, total: count || 0 });
}
