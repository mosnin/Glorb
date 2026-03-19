import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const data = event.data;
      const email =
        (data.email_addresses as { email_address: string }[])?.[0]?.email_address || "";

      await supabase.from("users").upsert(
        {
          clerk_id: data.id as string,
          email,
          display_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || null,
          avatar_url: (data.image_url as string) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_id" }
      );
      break;
    }
    case "user.deleted": {
      await supabase.from("users").delete().eq("clerk_id", event.data.id as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
