import { proxy } from "@/lib/proxyRoute";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/v1/pregames/${id}/invitations`, { method: "GET" }, "Erro ao listar links de convite");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxy(`/api/v1/pregames/${id}/invitations`, { method: "POST", body }, "Erro ao criar link de convite", 201);
}
