import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = createAdminSupabaseClient();
  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured");

  let query = supabase
    .from("templates")
    .select("id, type, name, description, category, tags, thumbnail_url, is_featured, use_count, created_at")
    .order("is_featured", { ascending: false })
    .order("use_count", { ascending: false });

  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category", category);
  if (featured === "true") query = query.eq("is_featured", true);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
