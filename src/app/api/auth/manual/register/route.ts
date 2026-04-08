import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const SESSION_MAX_AGE = 604800; // 7 dias

function makeSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `__session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

function makeUserCookie(name: string, email: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const value = encodeURIComponent(JSON.stringify({ name, email }));
  return `__session_user=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}
//[remover] logging depois de testar
export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string };
     console.log("registerBACKEND_URL value:", BACKEND_URL);
  console.log("[register] process.env.BACKEND_URL:", process.env.BACKEND_URL);
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { name, email, password } = body;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível. Tente novamente." }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const code: string = data?.code ?? data?.error ?? "";
    if (backendRes.status === 409 || code === "conflict") {
      return NextResponse.json({ error: "Este email já está cadastrado." }, { status: 409 });
    }
    if (backendRes.status === 422) {
      return NextResponse.json(
        { error: data?.message ?? "Dados inválidos.", fields: data?.fields },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Erro ao criar conta. Tente novamente." }, { status: 500 });
  }

  const { token } = data as { token: string };

  const response = NextResponse.json({ ok: true, redirect: "/cadastro" }, { status: 201 });
  response.headers.set("Set-Cookie", makeSessionCookie(token));
  response.headers.append("Set-Cookie", makeUserCookie(name!, email!));
  return response;
}
