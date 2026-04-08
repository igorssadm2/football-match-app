import { proxy } from "@/lib/proxyRoute";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(
    `/api/v1/pregames/${id}/guests`,
    { method: "POST", body, headers: { "Content-Type": "application/json" } },
    "Erro ao adicionar convidado",
    201
  );
}
