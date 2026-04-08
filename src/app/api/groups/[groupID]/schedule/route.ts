import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const { groupID } = await params;
  const body = await request.json();

  let res: Response;
  try {
    res = await backendFetch(`/api/v1/groups/${groupID}/schedule`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch {
    return unavailableResponse();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao atualizar agenda",
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
