"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { TeamDrawActionAlerts } from "@/components/pregame/team-draw/TeamDrawActionAlerts";
import { TeamDrawResultPanel } from "@/components/pregame/team-draw/TeamDrawResultPanel";
import { useSorteioPregameMeta } from "@/components/pregame/team-draw/useSorteioPregameMeta";
import { useTeamDraw } from "@/components/pregame/team-draw/useTeamDraw";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useError } from "@/contexts/ErrorContext";
import { discardTeamDrawDraft } from "@/lib/discardTeamDrawDraft";

export function SorteioResultadoClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: pregameId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdQ = searchParams.get("groupId") ?? "";
  const resortIntent = searchParams.get("resort") === "1";

  const { confirm } = useConfirm();
  const { pushError } = useError();
  const [discardingBack, setDiscardingBack] = useState(false);

  const meta = useSorteioPregameMeta(pregameId);
  const td = useTeamDraw({
    pregameId,
    canManage: meta.canManage,
    pregamePlayersPerTeam: meta.playersPerTeam,
    suggestedPlayersPerTeam: meta.suggestedPpt,
    confirmedParticipantsCount:
      meta.confirmedParticipantsCount === null ? undefined : meta.confirmedParticipantsCount,
    allowResortWhenConfirmed: resortIntent && meta.canManage,
  });

  useEffect(() => {
    if (td.loading || td.fetchError) return;
    if (td.isEmpty || !td.draw) {
      const q = groupIdQ ? `?groupId=${encodeURIComponent(groupIdQ)}` : "";
      router.replace(`/pregames/${pregameId}/sorteio/config${q}`);
    }
  }, [td.loading, td.fetchError, td.isEmpty, td.draw, pregameId, router, groupIdQ]);

  async function handleConfirmar() {
    const accepted = await confirm({
      title: "Confirmar times?",
      description:
        "Esta ação fixa o sorteio para os participantes. Depois você ainda pode mover jogadores entre times. Para sortear de novo, use o botão Sortear na partida.",
      confirmLabel: "Confirmar times",
      cancelLabel: "Cancelar",
      variant: "warning",
    });
    if (!accepted) return;
    const ok = await td.confirmTeams();
    if (!ok) return;
    const gid = groupIdQ || meta.groupId || "";
    if (gid) {
      router.push(
        `/grupos/${gid}/pregames/novo?pregameId=${encodeURIComponent(pregameId)}&drawDone=1`
      );
    } else {
      router.push(`/pregames/${pregameId}`);
    }
  }

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

  const groupIdForSorteio = groupIdQ || meta.groupId || "";
  const sorteioConfigHref = groupIdForSorteio
    ? `/pregames/${pregameId}/sorteio/config?groupId=${encodeURIComponent(groupIdForSorteio)}`
    : `/pregames/${pregameId}/sorteio/config`;
  const pregameHomeHref = `/pregames/${pregameId}`;

  async function handleBack() {
    if (discardingBack) return;
    if (!td.loading && td.draw && !td.draw.is_confirmed && td.canManage) {
      const ok = await confirm({
        title: "Sair do sorteio?",
        description:
          "Tem certeza? O rascunho será apagado e você precisará sortear de novo na partida.",
        confirmLabel: "Sair e descartar",
        cancelLabel: "Cancelar",
        variant: "danger",
      });
      if (!ok) return;
      setDiscardingBack(true);
      try {
        const discardResult = await discardTeamDrawDraft(pregameId);
        if (!discardResult.ok) {
          pushError({
            title: "Descartar sorteio",
            message: discardResult.message ?? "Não foi possível descartar o rascunho.",
            type: "server_error",
          });
          return;
        }
      } finally {
        setDiscardingBack(false);
      }
    }
    // Ir para a partida: não usar /sorteio/config aqui — essa rota redireciona de volta ao resultado
    // quando já existe sorteio, o que quebrava o voltar (ex.: perdia ?resort=1).
    router.replace(pregameHomeHref);
  }

  async function handleRessortear() {
    const d = td.draw;
    if (!d) return;
    if (d.is_confirmed && resortIntent) {
      const accepted = await confirm({
        title: "Ressortear do zero?",
        description:
          "O sorteio atual já foi confirmado. Ao continuar, ele será cancelado e todos os times serão definidos de novo — a composição pode mudar completamente. Na próxima tela você configura o modo do sorteio (balancear por overall ou não), pode re-sortear no rascunho e mover jogadores manualmente antes de confirmar de novo.",
        confirmLabel: "Continuar",
        cancelLabel: "Cancelar",
        variant: "warning",
      });
      if (!accepted) return;
      const r = await discardTeamDrawDraft(pregameId);
      if (!r.ok) {
        pushError({
          title: "Ressortear",
          message: r.message ?? "Não foi possível remover o sorteio atual.",
          type: "server_error",
        });
        return;
      }
      const sep = sorteioConfigHref.includes("?") ? "&" : "?";
      router.replace(`${sorteioConfigHref}${sep}novo=${Date.now()}`);
      return;
    }
    await td.createDraw(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => void handleBack()}
          disabled={discardingBack}
          aria-label="Voltar"
          className="shrink-0 -ml-1 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors mt-0.5 disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-zinc-100">Times sorteados</h1>
        </div>
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

      {!td.loading && !td.fetchError && td.draw && (
        <>
          <TeamDrawActionAlerts actionError={td.actionError} feedback={td.feedback} />
          <TeamDrawResultPanel
            draw={td.draw}
            canManage={td.canManage}
            submitting={td.submitting}
            confirming={td.confirming}
            copying={td.copying}
            movingParticipantId={td.movingParticipantId}
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
            drawControlsDisabled={td.drawControlsDisabled}
            onRessortear={() => void handleRessortear()}
            onConfirmarTimes={() => void handleConfirmar()}
            showCopyWhatsApp={false}
            moveParticipant={td.moveParticipant}
            swapParticipants={td.swapParticipants}
            stickyActions
            showDraftControlsWhenConfirmed={
              resortIntent && meta.canManage && td.draw.is_confirmed
            }
          />
        </>
      )}
    </div>
  );
}
