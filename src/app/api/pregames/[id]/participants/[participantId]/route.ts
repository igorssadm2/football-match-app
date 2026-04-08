import { proxy } from "@/lib/proxyRoute";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id, participantId } = await params;
  return proxy(
    `/api/v1/pregames/${id}/participants/${participantId}`,
    { method: "DELETE" },
    "Erro ao remover participante"
  );
}
