"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";
import { TeamDrawActionAlerts } from "@/components/pregame/team-draw/TeamDrawActionAlerts";
import { TeamDrawConfigPanel } from "@/components/pregame/team-draw/TeamDrawConfigPanel";
import { useSorteioPregameMeta } from "@/components/pregame/team-draw/useSorteioPregameMeta";
import { useTeamDraw } from "@/components/pregame/team-draw/useTeamDraw";

export function SorteioConfigClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: pregameId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdQ = searchParams.get("groupId") ?? "";
  const novo = searchParams.get("novo");

  const meta = useSorteioPregameMeta(pregameId);
  const td = useTeamDraw({
    pregameId,
    canManage: meta.canManage,
    pregamePlayersPerTeam: meta.playersPerTeam,
    suggestedPlayersPerTeam: meta.suggestedPpt,
    confirmedParticipantsCount:
      meta.confirmedParticipantsCount === null ? undefined : meta.confirmedParticipantsCount,
    newDrawSignal: novo,
  });

  useEffect(() => {
    if (td.loading || td.fetchError) return;
    if (!td.hasTeams || !td.draw) return;
    const q = groupIdQ ? `?groupId=${encodeURIComponent(groupIdQ)}` : "";
    router.replace(`/pregames/${pregameId}/sorteio/resultado${q}`);
  }, [td.loading, td.fetchError, td.hasTeams, td.draw, pregameId, router, groupIdQ]);

  if (meta.loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400 text-sm py-12 justify-center">
        <span className="w-5 h-5 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
        Carregando…
      </div>
    );
  }

  if (meta.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {meta.error}
      </div>
    );
  }

  const backHref = `/pregames/${pregameId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Voltar"
          className="shrink-0 -ml-1 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-black text-zinc-100 min-w-0">Configurar sorteio</h1>
      </div>

      {td.loading && (
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <span className="w-4 h-4 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
          Carregando sorteio…
        </div>
      )}

      {!td.loading && td.fetchError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
          <p className="text-sm text-red-300">{td.fetchError}</p>
          <button
            type="button"
            onClick={() => void td.fetchCurrentDraw()}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!td.loading && !td.fetchError && td.hasTeams && td.draw && (
        <p className="text-sm text-zinc-500">Abrindo resultado do sorteio…</p>
      )}

      {!td.loading && !td.fetchError && td.isEmpty && (
        <>
          <TeamDrawActionAlerts actionError={td.actionError} feedback={td.feedback} />
          <TeamDrawConfigPanel
            balanceByOverall={td.balanceByOverall}
            setBalanceByOverall={td.setBalanceByOverall}
            drawMode={td.drawMode}
            setDrawMode={td.setDrawMode}
            numTeams={td.numTeams}
            setNumTeams={td.setNumTeams}
            pptPlayers={td.pptPlayers}
            setPptPlayers={td.setPptPlayers}
            numTeamsError={td.numTeamsError}
            pptError={td.pptError}
            submitting={td.submitting}
            canManage={td.canManage}
            onRealizarSorteio={async () => {
              await td.createDraw(false);
            }}
            idPrefix="page"
          />
        </>
      )}
    </div>
  );
}
