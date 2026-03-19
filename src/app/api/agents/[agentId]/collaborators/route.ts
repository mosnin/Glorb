import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("entity_collaborators")
    .select("*")
    .eq("entity_type", "agent")
    .eq("entity_id", agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user info
  const adminSupabase = createAdminSupabaseClient();
  const userIds = data?.map((c) => c.user_id) || [];
  const { data: users } = await adminSupabase
    .from("users")
    .select("clerk_id, email, display_name, avatar_url")
    .in("clerk_id", userIds);

  const enriched = data?.map((c) => ({
    ...c,
    user: users?.find((u) => u.clerk_id === c.user_id) || null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();

  if (!body.email || !body.role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }

  // Verify agent ownership
  const supabase = await createServerSupabaseClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("user_id")
    .eq("id", agentId)
    .single();

  if (!agent || agent.user_id !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Look up user
  const adminSupabase = createAdminSupabaseClient();
  const { data: targetUser } = await adminSupabase
    .from("users")
    .select("clerk_id")
    .eq("email", body.email)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("entity_collaborators")
    .upsert(
      {
        entity_type: "agent",
        entity_id: agentId,
        user_id: targetUser.clerk_id,
        role: body.role,
      },
      { onConflict: "entity_type,entity_id,user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const collaboratorUserId = searchParams.get("user_id");

  if (!collaboratorUserId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("entity_collaborators")
    .delete()
    .eq("entity_type", "agent")
    .eq("entity_id", agentId)
    .eq("user_id", collaboratorUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
