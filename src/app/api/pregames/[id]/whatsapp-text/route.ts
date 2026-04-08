import { proxy } from "@/lib/proxyRoute";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(
    `/api/v1/pregames/${id}/whatsapp-text`,
    { method: "GET" },
    "Erro ao gerar texto para WhatsApp"
  );
}
