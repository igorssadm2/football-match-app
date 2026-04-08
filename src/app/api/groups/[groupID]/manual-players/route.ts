import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { unauthorizedResponse, unavailableResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const { groupID } = await params;
  const sp = request.nextUrl.searchParams;
  const qs = new URLSearchParams();
  const limit = sp.get("limit");
  const offset = sp.get("offset");
  if (limit != null && limit !== "") qs.set("limit", limit);
  if (offset != null && offset !== "") qs.set("offset", offset);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const path = `/api/v1/groups/${groupID}/manual-players${suffix}`;

  let res: Response;
  try {
    res = await backendFetch(path, { method: "GET" });
  } catch {
    return unavailableResponse();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao listar perfis manuais",
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
