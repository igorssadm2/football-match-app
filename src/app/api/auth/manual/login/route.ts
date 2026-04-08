import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";
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

async function resolveDestination(token: string): Promise<string> {
  const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  try {
    const profileRes = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      method: "POST",
      headers: authHeader,
    });
    if (!profileRes.ok) return "/cadastro";

    const profileData = await profileRes.json().catch(() => null);
    const profileComplete = (profileData?.profile?.height_cm ?? 0) > 0;
    if (!profileComplete) return "/cadastro";

    const surveyRes = await fetch(`${BACKEND_URL}/api/v1/marketingQuestions/survey-status`, {
      headers: authHeader,
    });
    if (!surveyRes.ok) return "/dashboard";

    const surveyData = await surveyRes.json().catch(() => null);
    return surveyData?.is_completed ? "/dashboard" : "/cadastro?etapa=esportes";
  } catch {
    return "/dashboard";
  }
}
//[remover] logging depois de testar
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
   console.log("[v0] BACKEND_URL value:", BACKEND_URL);
  console.log("[v0] process.env.BACKEND_URL:", process.env.BACKEND_URL);
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { email, password } = body;
 console.log("[v0] Attempting to fetch:", `${BACKEND_URL}/api/v1/auth/login`);
  
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível. Tente novamente." }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    const code: string = data?.code ?? data?.error ?? "";
    if (backendRes.status === 404 || code === "not_found") {
      return NextResponse.json({ error: "Email não encontrado." }, { status: 404 });
    }
    if (backendRes.status === 401 || code === "unauthorized") {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }
    if (code === "email_login_not_available") {
      return NextResponse.json(
        { error: "Esta conta usa login pelo Google. Clique em 'Continuar com Google'." },
        { status: 400 }
      );
    }
    if (backendRes.status === 422) {
      return NextResponse.json({ error: data?.message ?? "Dados inválidos." }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro ao entrar. Tente novamente." }, { status: 500 });
  }

  const { token, name } = data as { token: string; name: string };
  const destination = await resolveDestination(token);

  const response = NextResponse.json({ ok: true, redirect: destination });
  response.headers.set("Set-Cookie", makeSessionCookie(token));
  response.headers.append("Set-Cookie", makeUserCookie(name, email!));
  return response;
}
