import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  let res: Response;
  try {
    res = await backendFetch("/api/v1/groups", { method: "GET" });
  } catch {
    return unavailableResponse();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao listar grupos",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  let res: Response;
  try {
    res = await backendFetch("/api/v1/groups", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return unavailableResponse();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao criar grupo",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data, { status: 201 });
}
