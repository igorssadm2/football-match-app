"use client";

/**
 * Mensagens de ação do sorteio (erro/feedback) em destaque no topo do fluxo,
 * em vez de uma faixa pequena no fim da página.
 */
export function TeamDrawActionAlerts({
  actionError,
  feedback,
}: {
  actionError: string | null;
  feedback: string | null;
}) {
  if (!actionError && !feedback) return null;

  return (
    <div className="space-y-3">
      {actionError && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-amber-500/45 bg-gradient-to-br from-amber-950/70 to-zinc-950/90 p-4 text-sm text-amber-50 shadow-lg ring-1 ring-amber-500/20"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </span>
          <p className="min-w-0 flex-1 pt-1 font-medium leading-relaxed">{actionError}</p>
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/35 p-4 text-sm text-emerald-50 shadow-md ring-1 ring-emerald-500/15"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <p className="min-w-0 flex-1 pt-1 font-medium leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}
