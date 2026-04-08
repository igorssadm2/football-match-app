import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import Link from "next/link";

interface GroupItem {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  status: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

async function fetchGroups(): Promise<GroupItem[]> {
  try {
    const res = await backendFetch("/api/v1/groups", { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json() as { groups: GroupItem[] };
    return data.groups ?? [];
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const isArchived = status === "archived";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
      isArchived ? "bg-zinc-700/60 text-zinc-400" : "bg-green-500/10 text-green-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? "bg-zinc-500" : "bg-green-400"}`} />
      {isArchived ? "Arquivado" : "Ativo"}
    </span>
  );
}

export default async function GruposPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const groups = await fetchGroups();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/dashboard" className="font-black text-lg tracking-tight">
              vamo<span className="text-green-400">jogar</span>
            </Link>
          </div>
          <Link
            href="/grupos/novo"
            className="rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 font-semibold text-sm px-4 py-2 transition-colors"
          >
            + Novo grupo
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-green-400 text-sm font-semibold mb-1">Comunidade</p>
          <h1 className="text-3xl font-black">Meus Grupos</h1>
          <p className="text-zinc-500 mt-1">
            {groups.length > 0
              ? `Você faz parte de ${groups.length} grupo${groups.length > 1 ? "s" : ""}`
              : "Gerencie seus grupos e organize partidas"}
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-2xl mb-1">
              🏟️
            </div>
            <p className="font-bold text-zinc-200 text-lg">Nenhum grupo ainda</p>
            <p className="text-zinc-500 text-sm max-w-xs">
              Crie um grupo, convide seus amigos e comece a organizar partidas.
            </p>
            <Link
              href="/grupos/novo"
              className="mt-2 rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 font-semibold text-sm px-6 py-2.5 transition-colors"
            >
              Criar primeiro grupo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/grupos/${group.id}`}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-3 hover:border-zinc-700 hover:bg-zinc-900 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-100 group-hover:text-white transition-colors truncate">
                      {group.name}
                    </p>
                    {group.description && (
                      <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  <StatusBadge status={group.status} />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {group.member_count} {group.member_count === 1 ? "membro" : "membros"}
                  </div>
                  <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
