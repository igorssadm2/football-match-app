import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/session";
import { resolveRegistrationRoute } from "@/lib/registrationFlow";
import Link from "next/link";
import CadastroForm from "./CadastroForm";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const params = await searchParams;
  const startAtSurvey = params.etapa === "esportes";

  // Guard: se o registro já está completo, redireciona para o destino correto
  if (!startAtSurvey) {
    const route = await resolveRegistrationRoute();
    if (route !== "/cadastro") redirect(route);
  }

  const firstName = session.name?.split(" ")[0] ?? "Jogador";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Pular por enquanto
          </Link>
        </div>
      </nav>
      <main className="p-4 py-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">

          {/* Player card header */}
          <div className="relative rounded-2xl overflow-hidden mb-4 border border-zinc-800">
            {/* Green field stripe */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-400" />

            <div className="relative flex items-center gap-4 p-4">
              {session.picture ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={session.picture}
                  alt={firstName}
                  className="w-16 h-16 rounded-full border-2 border-green-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-green-400">{firstName[0]}</span>
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold tracking-widest text-green-400 uppercase mb-0.5">Novo jogador</p>
                <h1 className="text-2xl font-black text-zinc-100 truncate">{firstName}</h1>
                <p className="text-zinc-500 text-sm truncate">{session.email}</p>
              </div>

              <div className="ml-auto shrink-0 text-right">
                <p className="text-5xl font-black text-green-500/20 leading-none select-none">⚽</p>
              </div>
            </div>

            <div className="border-t border-zinc-800 px-6 py-3 bg-zinc-900/50">
              <p className="text-sm text-zinc-400">
                {startAtSurvey 
                  ? "Nos ajude a te conhecer melhor!" 
                  : "Complete seu perfil para entrar em campo."
                }
              </p>
            </div>
          </div>

          <CadastroForm startAtSurvey={startAtSurvey} />
        </div>
      </main>
    </div>
  );
}
