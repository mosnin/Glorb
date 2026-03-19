import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("cluster_files")
    .select("*")
    .eq("cluster_id", clusterId)
    .order("file_path");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clusterId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabaseClient();

  const storagePath = `${userId}/clusters/${clusterId}/${body.file_path}`;

  const { error: storageError } = await supabase.storage
    .from("agent-files")
    .upload(storagePath, new Blob([body.content], { type: "text/plain" }), {
      upsert: true,
    });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const fileName = body.file_path.split("/").pop() || body.file_path;

  const { data, error } = await supabase
    .from("cluster_files")
    .insert({
      cluster_id: clusterId,
      file_name: fileName,
      file_path: body.file_path,
      file_type: body.file_type || "other",
      storage_path: storagePath,
      mime_type: body.file_path.endsWith(".json") ? "application/json" : "text/markdown",
      size_bytes: new Blob([body.content]).size,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
