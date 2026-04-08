import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

async function handleProxy(path: string, init: RequestInit, fallbackTitle: string, status?: number) {
  let res: Response;
  try {
    res = await backendFetch(path, init);
  } catch {
    return unavailableResponse();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? fallbackTitle,
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }
  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: status ?? 200 });
}

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID } = await params;
  return handleProxy(`/api/v1/groups/${groupID}/locations`, { method: "GET" }, "Erro ao buscar locais");
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID } = await params;
  const body = await request.json();
  return handleProxy(`/api/v1/groups/${groupID}/locations`, { method: "POST", body: JSON.stringify(body) }, "Erro ao adicionar local", 201);
}
