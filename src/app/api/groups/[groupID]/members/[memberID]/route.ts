import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string; memberID: string }> };

async function handle(path: string, init: RequestInit, fallback: string, status = 200) {
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
        title: data?.title ?? fallback,
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }
  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status });
}

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID, memberID } = await params;
  return handle(`/api/v1/groups/${groupID}/members/${memberID}`, { method: "GET" }, "Erro ao buscar membro");
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID, memberID } = await params;
  return handle(`/api/v1/groups/${groupID}/members/${memberID}`, { method: "DELETE" }, "Erro ao remover membro");
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID, memberID } = await params;
  const body = await request.json();
  return handle(
    `/api/v1/groups/${groupID}/members/${memberID}`,
    { method: "PATCH", body: JSON.stringify(body) },
    "Erro ao atualizar membro"
  );
}
