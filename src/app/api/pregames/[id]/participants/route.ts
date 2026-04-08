import { proxy } from "@/lib/proxyRoute";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/participants`, { method: "GET" }, "Erro ao carregar participantes");
}
