"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseBackendError } from "@/contexts/ErrorContext";

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [pregameId, setPregameId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function processInvite() {
      try {
        const res = await fetch(`/api/pregames/invitations/${token}/accept`, {
          method: "POST"
        });

        if (res.status === 401) {
          // Use search params to redirect back here after login
          router.push(`/login?redirect=${encodeURIComponent(`/pregames/invite/${token}`)}`);
          return;
        }

        if (!res.ok) {
          const err = await parseBackendError(res, { title: "Erro", type: "server_error" });
          setErrorMessage(err.message || "Não foi possível aceitar o convite.");
          setStatus("error");
          return;
        }

        const data = await res.json() as { pregame_id?: string };
        if (data.pregame_id) {
          setPregameId(data.pregame_id);
          setStatus("success");
          // Optionally, redirect immediately:
          // router.push(`/pregames/${data.pregame_id}`);
        } else {
          // If no pregame_id, just show success and a button to dashboard
          setStatus("success");
        }

      } catch {
        setErrorMessage("Erro de conexão ao processar o convite.");
        setStatus("error");
      }
    }

    processInvite();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl">
        
        <Link href="/" className="inline-block font-black text-2xl tracking-tight mb-8">
          vamo<span className="text-green-400">jogar</span>
        </Link>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <span className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-xl font-bold text-zinc-100 mt-2">Processando convite...</h1>
            <p className="text-sm text-zinc-500">Quase lá, estamos confirmando seu acesso.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center mb-2 text-green-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-100">Convite aceito!</h1>
            <p className="text-sm text-zinc-400 mb-4">Você agora faz parte da partida e do grupo.</p>
            
            <button
              onClick={() => router.push(pregameId ? `/pregames/${pregameId}` : '/dashboard')}
              className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3.5 transition-colors"
            >
              Ir para a partida
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mb-2 text-red-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-100">Ops, algo deu errado</h1>
            <p className="text-sm text-zinc-400">{errorMessage}</p>
            
            <Link
              href="/dashboard"
              className="mt-4 w-full block rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3.5 transition-colors"
            >
              Ir para o Painel Principal
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
