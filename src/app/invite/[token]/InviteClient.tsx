"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InvitationPreview {
  id: string;
  group_id: string;
  /** Preenchido pelo backend em GET /api/v1/invitations/:token (snake_case ou camelCase) */
  group_name?: string;
  groupName?: string;
  token: string;
  status: string;
  is_valid: boolean;
  is_expired: boolean;
  is_exhausted: boolean;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  created_at: string;
}

interface Props {
  token: string;
  preview: InvitationPreview | null;
  error: string | null;
  isLoggedIn: boolean;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin inline-block" />
  );
}

export default function InviteClient({ token, preview, error, isLoggedIn }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 410) {
        setAcceptError("Este convite não é mais válido (expirado, revogado ou esgotado).");
        return;
      }
      if (res.status === 422) {
        // Likely already a member — redirect to the group anyway
        if (preview) {
          router.push(`/grupos/${preview.group_id}`);
        }
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAcceptError(data?.message ?? "Erro ao aceitar convite.");
        return;
      }
      const data = await res.json() as { group_id: string };
      router.push(`/grupos/${data.group_id}`);
    } catch {
      setAcceptError("Não foi possível conectar ao servidor.");
    } finally {
      setAccepting(false);
    }
  }

  const unavailable = preview && !preview.is_valid;
  const groupDisplayName = preview
    ? (preview.group_name ?? preview.groupName)?.trim() || undefined
    : undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {/* ── Error state ─────────────────────────────────────────── */}
          {error && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center py-14 text-center gap-4 px-8">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-zinc-200">Convite inválido</p>
              <p className="text-zinc-500 text-sm">{error}</p>
              <Link href="/" className="mt-1 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">
                Ir para o início
              </Link>
            </div>
          )}

          {/* ── Unavailable (expired / revoked / exhausted) ──────────── */}
          {!error && unavailable && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center py-14 text-center gap-4 px-8">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-zinc-200">Convite indisponível</p>
              <p className="text-zinc-500 text-sm">
                {preview!.is_expired
                  ? "Este convite expirou."
                  : preview!.is_exhausted
                  ? "Este convite atingiu o limite de usos."
                  : "Este convite foi revogado ou não é mais válido."}
              </p>
              <Link href="/" className="mt-1 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">
                Ir para o início
              </Link>
            </div>
          )}

          {/* ── Valid invite ─────────────────────────────────────────── */}
          {!error && preview && preview.is_valid && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-100">Convite para grupo</p>
                    {groupDisplayName ? (
                      <p className="text-sm text-zinc-300 font-semibold truncate mt-0.5" title={groupDisplayName}>
                        {groupDisplayName}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{preview.group_id.slice(0, 8)}…</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Expira em</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{formatDate(preview.expires_at)}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Usos</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                      {preview.current_uses}
                      {preview.max_uses > 0 ? ` / ${preview.max_uses}` : " (ilimitado)"}
                    </p>
                  </div>
                </div>

                {acceptError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                    <p className="text-sm text-red-400">{acceptError}</p>
                  </div>
                )}

                {isLoggedIn ? (
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {accepting ? <Spinner /> : "Entrar no grupo"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500 text-center">Faça login para aceitar o convite</p>
                    <Link
                      href={`/login?redirect=/invite/${token}`}
                      className="block w-full rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3.5 text-sm transition-colors text-center"
                    >
                      Fazer login
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
