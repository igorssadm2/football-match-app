import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const origin = `${proto}://${host}`;
  const redirectParam = url.searchParams.get("redirect");
  const safeRedirect = redirectParam?.startsWith("/") ? redirectParam : null;

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  if (safeRedirect) {
    response.cookies.set("oauth_redirect", safeRedirect, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
