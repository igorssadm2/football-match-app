import { proxy } from "@/lib/proxyRoute";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/join`, { method: "POST" }, "Erro ao entrar na partida");
}
