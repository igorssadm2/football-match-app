import { proxy } from "@/lib/proxyRoute";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/team-draw`, { method: "GET" }, "Erro ao buscar sorteio atual");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(
    `/api/v1/pregames/${id}/team-draw`,
    { method: "POST", body, headers: { "Content-Type": "application/json" } },
    "Erro ao criar sorteio de times",
    201
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/team-draw`, { method: "DELETE" }, "Erro ao descartar sorteio");
}
