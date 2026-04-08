import { NextRequest } from "next/server";
import { proxy } from "@/lib/proxyRoute";

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  return proxy(
    `/api/v1/invitations/${token}/accept`,
    { method: "POST", body: JSON.stringify({}) },
    "Erro ao aceitar convite"
  );
}
