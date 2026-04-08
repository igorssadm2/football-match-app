import { proxy } from "@/lib/proxyRoute";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return proxy(`/api/v1/pregames/invitations/${token}/accept`, { method: "POST" }, "Erro ao aceitar convite da partida");
}
