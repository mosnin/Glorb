import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const { role } = await req.json();

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "role must be admin, editor, or viewer" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("owner_id", userId)
    .eq("member_id", memberId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
