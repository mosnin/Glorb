import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json(data?.preferences || {});
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preferences = await req.json();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
