import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; scheduleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name) updateData.name = body.name;
  if (body.cron_expression) updateData.cron_expression = body.cron_expression;
  if (body.input_message) updateData.input_message = body.input_message;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  const { data, error } = await supabase
    .from("agent_schedules")
    .update(updateData)
    .eq("id", scheduleId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; scheduleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("agent_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
