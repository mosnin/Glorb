import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_memories")
    .select("*")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agent_memories")
    .upsert(
      {
        agent_id: agentId,
        user_id: userId,
        key: body.key,
        value: body.value,
        metadata: body.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,user_id,key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const memoryId = searchParams.get("id");

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("agent_memories")
    .delete()
    .eq("agent_id", agentId)
    .eq("user_id", userId);

  if (memoryId) query = query.eq("id", memoryId);
  else if (key) query = query.eq("key", key);
  else return NextResponse.json({ error: "key or id required" }, { status: 400 });

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
