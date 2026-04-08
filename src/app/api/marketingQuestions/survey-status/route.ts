import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";

function unauthorized() {
  return NextResponse.json(
    { title: "Não autenticado", type: "unauthorized", message: "Faça login para continuar." },
    { status: 401 }
  );
}

function unavailable() {
  return NextResponse.json(
    { title: "Serviço indisponível", type: "connection_error", message: "Não foi possível conectar ao servidor." },
    { status: 503 }
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  let res: Response;
  try {
    res = await backendFetch("/api/v1/marketingQuestions/survey-status", { method: "GET" });
  } catch {
    return unavailable();
  }

  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();

  let res: Response;
  try {
    res = await backendFetch("/api/v1/marketingQuestions/survey-status", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch {
    return unavailable();
  }

  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
