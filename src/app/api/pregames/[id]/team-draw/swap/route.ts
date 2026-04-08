import { proxy } from "@/lib/proxyRoute";

/**
 * Troca dois jogadores entre times de forma atômica.
 * Body: { participant_id_a: string; participant_id_b: string }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(
    `/api/v1/pregames/${id}/team-draw/assignments/swap`,
    { method: "POST", body, headers: { "Content-Type": "application/json" } },
    "Erro ao trocar jogadores entre times",
    200
  );
}
