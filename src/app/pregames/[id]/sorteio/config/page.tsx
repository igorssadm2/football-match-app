import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/firebase/session";
import { SorteioConfigClient } from "./SorteioConfigClient";

export default async function SorteioConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <Suspense
          fallback={
            <div className="flex items-center gap-3 text-zinc-400 text-sm py-12 justify-center">
              <span className="w-5 h-5 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
              Carregando…
            </div>
          }
        >
          <SorteioConfigClient params={params} />
        </Suspense>
      </div>
    </div>
  );
}
