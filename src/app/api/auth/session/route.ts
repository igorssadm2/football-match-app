import { getAdminAuth } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

const COOKIE_NAME = "__session";
const COOKIE_OPTIONS = "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800"; // 7 dias

function setSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${COOKIE_OPTIONS}${secure}`;
}

export async function POST(request: Request) {
  try {
    let token: string | null = null;
    let redirectTo: string | null = null;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      token = form.get("token") as string | null;
      redirectTo = form.get("redirectTo") as string | null;
    } else {
      const body = (await request.json()) as { token?: string; redirectTo?: string };
      token = body.token ?? null;
      redirectTo = body.redirectTo ?? null;
    }

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    await getAdminAuth().verifyIdToken(token);

    const cookieHeader = setSessionCookie(token);

    if (redirectTo && redirectTo.startsWith("/")) {
      const res = NextResponse.redirect(new URL(redirectTo, request.url), 302);
      res.headers.set("Set-Cookie", cookieHeader);
      return res;
    }

    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid token";
    console.error("Session POST error:", message);
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL("/login?error=invalid", request.url), 302);
    }
    const detail = process.env.NODE_ENV === "development" ? message : "Invalid token";
    return NextResponse.json({ error: "Invalid token", detail }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", `__session_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
