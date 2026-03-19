import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(new URL("/settings?error=missing_params", req.url));
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/settings?error=token_exchange", req.url));
  }

  // Get GitHub user info
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const githubUser = await userResponse.json();

  // Store in DB
  const supabase = createAdminSupabaseClient();
  await supabase.from("github_connections").upsert(
    {
      user_id: userId,
      github_user_id: String(githubUser.id),
      github_username: githubUser.login,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      scopes: tokenData.scope ? tokenData.scope.split(",") : [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,github_user_id" }
  );

  return NextResponse.redirect(new URL("/settings?github=connected", req.url));
}
