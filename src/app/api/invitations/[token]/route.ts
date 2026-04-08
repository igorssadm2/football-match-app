import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/lib/proxyRoute";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";

type Params = { params: Promise<{ token: string }> };

// Public — no auth required
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/v1/invitations/${token}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { title: "Serviço indisponível", type: "connection_error", message: "Não foi possível conectar ao servidor." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Convite não encontrado",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}

// Requires auth — invitationID passed as token param
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  return proxy(
    `/api/v1/invitations/${token}`,
    { method: "DELETE" },
    "Erro ao revogar convite"
  );
}
