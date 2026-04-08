import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { title: "Não autenticado", type: "unauthorized", message: "Faça login para continuar." },
      { status: 401 }
    );
  }

  const body = await request.json();

  let res: Response;
  try {
    res = await backendFetch("/api/v1/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { title: "Serviço indisponível", type: "connection_error", message: "Não foi possível conectar ao servidor. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        title: data?.title ?? "Erro ao salvar perfil",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data);
}
