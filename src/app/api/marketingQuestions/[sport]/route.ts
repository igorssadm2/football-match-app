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
    { title: "Serviço indisponível", type: "connection_error", message: "Não foi possível conectar ao servidor. Tente novamente em instantes." },
    { status: 503 }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sport: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { sport } = await params;

  let res: Response;
  try {
    res = await backendFetch(`/api/v1/marketingQuestions/${session.uid}/${sport}`, { method: "GET" });
  } catch {
    return unavailable();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao buscar perguntas",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sport: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { sport } = await params;
  const body = await request.json();

  let res: Response;
  try {
    res = await backendFetch(`/api/v1/marketingQuestions/${session.uid}/${sport}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return unavailable();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao salvar respostas",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}
