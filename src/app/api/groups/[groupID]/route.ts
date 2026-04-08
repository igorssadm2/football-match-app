import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

async function handleProxy(path: string, init: RequestInit, fallbackTitle: string) {
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
  return NextResponse.json(data);
}

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID } = await params;
  return handleProxy(`/api/v1/groups/${groupID}`, { method: "GET" }, "Erro ao buscar grupo");
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID } = await params;
  const body = await request.json();
  return handleProxy(`/api/v1/groups/${groupID}`, { method: "PUT", body: JSON.stringify(body) }, "Erro ao atualizar grupo");
}
