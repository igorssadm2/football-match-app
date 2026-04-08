import { proxy } from "@/lib/proxyRoute";

/** Body vazio conforme API; envia `{}` para manter Content-Type JSON. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(
    `/api/v1/pregames/${id}/team-draw/confirm`,
    { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } },
    "Erro ao confirmar times",
    200
  );
}
