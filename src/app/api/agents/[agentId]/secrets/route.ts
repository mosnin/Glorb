import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/secrets";

// GET — List secrets (names only, no values)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_secrets")
    .select("id, name, description, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — Create a new secret
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json();
  const { name, value, description } = body;

  if (!name || !value) {
    return NextResponse.json({ error: "name and value are required" }, { status: 400 });
  }

  // Validate name format (alphanumeric + underscore)
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    return NextResponse.json(
      { error: "Secret name must be UPPER_SNAKE_CASE (e.g., OPENAI_API_KEY)" },
      { status: 400 }
    );
  }

  const encrypted = encryptSecret(value);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("agent_secrets")
    .upsert(
      {
        agent_id: agentId,
        user_id: userId,
        name,
        encrypted_value: encrypted,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,name" }
    )
    .select("id, name, description, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE — Remove a secret by name (query param)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name query param required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("agent_secrets")
    .delete()
    .eq("agent_id", agentId)
    .eq("name", name);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: name });
}
