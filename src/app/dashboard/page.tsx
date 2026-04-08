import { getSession } from "@/lib/firebase/session";
import { backendFetch } from "@/lib/backend";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import SportSection from "./SportSection";
import Link from "next/link";
import { PendingInvites } from "@/components/pregame/PendingInvites";

interface GroupItem {
  id: string;
  name: string;
  description: string;
  status: string;
  member_count: number;
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
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
      isArchived ? "bg-zinc-700/60 text-zinc-400" : "bg-green-500/10 text-green-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? "bg-zinc-500" : "bg-green-400"}`} />
      {isArchived ? "Arquivado" : "Ativo"}
    </span>
  );
}

const MAX_PREVIEW = 4;

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const groups = await fetchGroups();
  const firstName = user.name?.split(" ")[0] ?? "Jogador";
  const previewGroups = groups.slice(0, MAX_PREVIEW);
  const activeGroups = groups.filter((g) => g.status !== "archived").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </Link>
          <div className="flex items-center gap-3">
            {user.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={firstName}
                className="w-8 h-8 rounded-full border-2 border-zinc-700"
                referrerPolicy="no-referrer"
              />
            )}
            <LogoutButton />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <PendingInvites />

        {/* Hero */}
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-green-400 text-sm font-semibold mb-1">Bem-vindo de volta</p>
                <h1 className="text-3xl font-black leading-tight">E aí, {firstName}!</h1>
                <p className="text-zinc-500 mt-1 text-sm">Pronto pra entrar em campo?</p>
              </div>
              {user.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={firstName}
                  className="w-14 h-14 rounded-2xl border-2 border-zinc-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-zinc-800/60 grid grid-cols-3 gap-4">
              {[
                { value: "0", label: "Partidas" },
                { value: "0", label: "Gols" },
                { value: String(activeGroups), label: "Grupos ativos" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-black text-zinc-100">{value}</span>
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meu Esporte */}
        <SportSection />

        {/* Grupos */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-400 text-sm font-semibold mb-0.5">Comunidade</p>
              <h2 className="text-2xl font-black">Meus Grupos</h2>
              <p className="text-zinc-500 text-sm mt-0.5">
                {groups.length > 0
                  ? `Você faz parte de ${groups.length} grupo${groups.length > 1 ? "s" : ""}`
                  : "Crie um grupo e organize suas peladas"}
              </p>
            </div>
            <Link
              href="/grupos/novo"
              className="shrink-0 rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 text-zinc-950 font-semibold text-sm px-4 py-2 transition-all duration-150"
            >
              + Novo grupo
            </Link>
          </div>

          {groups.length === 0 ? (
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col items-center justify-center py-14 text-center gap-3">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl">🏟️</div>
              <div>
                <p className="font-bold text-zinc-200">Nenhum grupo ainda</p>
                <p className="text-zinc-500 text-sm mt-0.5 max-w-xs mx-auto">
                  Crie um grupo, convide seus amigos e comece a organizar partidas.
                </p>
              </div>
              <Link
                href="/grupos/novo"
                className="mt-1 rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 text-zinc-950 font-semibold text-sm px-5 py-2 transition-all duration-150"
              >
                Criar primeiro grupo
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {previewGroups.map((group) => (
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

              {groups.length > MAX_PREVIEW && (
                <Link
                  href="/grupos"
                  className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm font-semibold text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all duration-150"
                >
                  Ver todos os {groups.length} grupos
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
