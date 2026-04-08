import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/session";
import Link from "next/link";
import CreateGroupForm from "./CreateGroupForm";

export default async function NovoGrupoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/grupos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/dashboard" className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-green-400 text-sm font-semibold mb-1">Novo grupo</p>
          <h1 className="text-3xl font-black">Criar Grupo</h1>
          <p className="text-zinc-500 mt-1">Configure seu grupo e comece a adicionar jogadores</p>
        </div>
        <CreateGroupForm />
      </div>
    </div>
  );
}
