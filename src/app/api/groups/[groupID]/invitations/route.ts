import { NextRequest } from "next/server";
import { proxy } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { groupID } = await params;
  return proxy(
    `/api/v1/groups/${groupID}/invitations`,
    { method: "GET" },
    "Erro ao listar convites"
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const { groupID } = await params;
  const body = await request.json();
  return proxy(
    `/api/v1/groups/${groupID}/invitations`,
    { method: "POST", body: JSON.stringify(body) },
    "Erro ao criar convite",
    201
  );
}
