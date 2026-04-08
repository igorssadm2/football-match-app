import { proxy } from "@/lib/proxyRoute";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}`, { method: "GET" }, "Erro ao buscar detalhes da partida");
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(`/api/v1/pregames/${id}`, { 
    method: "PUT", 
    body,
    headers: { "Content-Type": "application/json" }
  }, "Erro ao atualizar a partida");
}
