import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.url || !body.events?.length) {
    return NextResponse.json({ error: "name, url, and events are required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Generate webhook secret
  const secret = crypto.randomUUID();

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      user_id: userId,
      name: body.name,
      url: body.url,
      secret,
      events: body.events,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, secret }, { status: 201 });
}
