import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();

  // Get members of my workspace + workspaces I'm a member of
  const [{ data: myMembers }, { data: sharedWith }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("*")
      .eq("owner_id", userId)
      .order("invited_at", { ascending: false }),
    supabase
      .from("workspace_members")
      .select("*")
      .eq("member_id", userId)
      .order("invited_at", { ascending: false }),
  ]);

  return NextResponse.json({
    members: myMembers || [],
    shared_with_me: sharedWith || [],
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.email || !body.role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }

  const adminSupabase = createAdminSupabaseClient();

  // Look up user by email
  const { data: targetUser } = await adminSupabase
    .from("users")
    .select("clerk_id, email")
    .eq("email", body.email)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found. They must have a Glorb account first." }, { status: 404 });
  }

  if (targetUser.clerk_id === userId) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .upsert(
      {
        owner_id: userId,
        member_id: targetUser.clerk_id,
        member_email: body.email,
        role: body.role,
        invited_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,member_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("member_id");
  if (!memberId) return NextResponse.json({ error: "member_id required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("owner_id", userId)
    .eq("member_id", memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
