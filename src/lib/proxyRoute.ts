import { NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";

export function unauthorizedResponse() {
  return NextResponse.json(
    { title: "Não autenticado", type: "unauthorized", message: "Faça login para continuar." },
    { status: 401 }
  );
}

export function unavailableResponse() {
  return NextResponse.json(
    { title: "Serviço indisponível", type: "connection_error", message: "Não foi possível conectar ao servidor." },
    { status: 503 }
  );
}

// Checks session, calls backend, returns structured error or data response
export async function proxy(
  path: string,
  init: RequestInit,
  fallbackTitle: string,
  successStatus = 200
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  let res: Response;
  try {
    res = await backendFetch(path, init);
  } catch {
    return unavailableResponse();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof (data as { code?: unknown }).code === "string"
      ? (data as { code: string }).code
      : undefined;
    return NextResponse.json(
      {
        title: data?.title ?? fallbackTitle,
        type: data?.type ?? "server_error",
        message: data?.message ?? "Ocorreu um erro inesperado.",
        ...(code ? { code } : {}),
        ...(data?.errors ? { errors: data.errors } : {}),
      },
      { status: res.status }
    );
  }

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data: unknown = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: successStatus });
}
