import { proxy } from "@/lib/proxyRoute";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/leave`, { method: "DELETE" }, "Erro ao sair da partida");
}
