import { proxy } from "@/lib/proxyRoute";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(
    `/api/v1/pregames/${id}/team-draw/assignments`,
    { method: "PATCH", body, headers: { "Content-Type": "application/json" } },
    "Erro ao mover jogador entre times",
    200
  );
}
