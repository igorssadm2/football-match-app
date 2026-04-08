import { proxy } from "@/lib/proxyRoute";

export async function GET(request: Request, { params }: { params: Promise<{ groupID: string }> }) {
  const { groupID } = await params;
  return proxy(`/api/v1/groups/${groupID}/pregames`, { method: "GET" }, "Erro ao listar partidas");
}

export async function POST(request: Request, { params }: { params: Promise<{ groupID: string }> }) {
  const { groupID } = await params;
  const body = await request.text();
  return proxy(`/api/v1/groups/${groupID}/pregames`, {
    method: "POST",
    body
  }, "Erro ao criar partida", 201);
}
