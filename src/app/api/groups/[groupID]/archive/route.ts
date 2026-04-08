import { NextRequest } from "next/server";
import { getSession } from "@/lib/firebase/session";
import { proxy, unauthorizedResponse } from "@/lib/proxyRoute";

type Params = { params: Promise<{ groupID: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  const { groupID } = await params;
  return proxy(`/api/v1/groups/${groupID}/archive`, { method: "POST" }, "Erro ao arquivar grupo");
}
