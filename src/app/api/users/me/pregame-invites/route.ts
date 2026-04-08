import { proxy } from "@/lib/proxyRoute";

export async function GET() {
  return proxy(`/api/v1/users/me/pregame-invites`, { method: "GET" }, "Erro ao buscar convites pendentes");
}
