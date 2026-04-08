import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { title: "Não autenticado", type: "unauthorized", message: "Faça login para continuar." },
      { status: 401 }
    );
  }

  let res: Response;
  try {
    res = await backendFetch("/api/v1/users/me", { method: "POST" });
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
        title: data?.title ?? "Erro ao buscar dados",
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }

  const data: unknown = await res.json();
  return NextResponse.json(data);
}
