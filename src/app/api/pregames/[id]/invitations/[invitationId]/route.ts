import { proxy } from "@/lib/proxyRoute";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, invitationId: string }> }) {
  const { id, invitationId } = await params;
  return proxy(`/api/v1/pregames/${id}/invitations/${invitationId}`, { method: "DELETE" }, "Erro ao revogar convite");
}
