import { proxy } from "@/lib/proxyRoute";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, participantId: string }> }) {
  const { id, participantId } = await params;
  return proxy(`/api/v1/pregames/${id}/participants/${participantId}/reject`, { method: "PATCH" }, "Erro ao rejeitar participante");
}
