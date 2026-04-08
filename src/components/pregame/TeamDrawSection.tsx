"use client";

import { useConfirm } from "@/contexts/ConfirmContext";
import { TeamDrawActionAlerts } from "./team-draw/TeamDrawActionAlerts";
import { TeamDrawConfigPanel } from "./team-draw/TeamDrawConfigPanel";
import { TeamDrawResultPanel } from "./team-draw/TeamDrawResultPanel";
import { useTeamDraw } from "./team-draw/useTeamDraw";

type Props = {
  pregameId: string;
  canManage: boolean;
  pregamePlayersPerTeam?: number | null;
  suggestedPlayersPerTeam?: number | null;
  onTeamDrawValidationParticipants?: (participantIds: string[]) => void;
};

/**
 * Composto para testes e usos legados: config + resultado num único bloco.
 * No app, o fluxo principal usa as rotas /pregames/[id]/sorteio/*.
 */
export function TeamDrawSection({
  pregameId,
  canManage,
  pregamePlayersPerTeam,
  suggestedPlayersPerTeam,
  onTeamDrawValidationParticipants,
}: Props) {
  const { confirm } = useConfirm();
  const td = useTeamDraw({
    pregameId,
    canManage,
    pregamePlayersPerTeam,
    suggestedPlayersPerTeam,
    onTeamDrawValidationParticipants,
  });

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-100">Sorteio de times</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Apenas participantes confirmados entram no sorteio. Lista de espera não participa.
          </p>
        </div>
        {td.hasTeams && (
          <button
            type="button"
            onClick={() => void td.fetchCurrentDraw()}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Atualizar
          </button>
        )}
      </div>

      {td.loading && (
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <span className="w-4 h-4 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
          Carregando sorteio...
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

      {!td.loading && !td.fetchError && (
        <TeamDrawActionAlerts actionError={td.actionError} feedback={td.feedback} />
      )}

      {!td.loading && !td.fetchError && td.isEmpty && (
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
          onRealizarSorteio={() => void td.createDraw(false)}
          idPrefix="empty"
        />
      )}

      {!td.loading && !td.fetchError && td.hasTeams && td.draw && (
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
          onRessortear={() => void td.createDraw(false)}
          onConfirmarTimes={() =>
            void (async () => {
              const accepted = await confirm({
                title: "Confirmar times?",
                description:
                  "Esta ação fixa o sorteio para os participantes. Depois você ainda pode mover jogadores entre times.",
                confirmLabel: "Confirmar times",
                cancelLabel: "Cancelar",
                variant: "warning",
              });
              if (!accepted) return;
              await td.confirmTeams();
            })()
          }
          onCopyWhatsapp={() => void td.handleCopyWhatsapp()}
          showCopyWhatsApp
          moveParticipant={td.moveParticipant}
          swapParticipants={td.swapParticipants}
          stickyActions={false}
        />
      )}

      {td.fallbackText !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Copie o texto abaixo</h3>
            <p className="text-xs text-zinc-500">
              Não foi possível copiar automaticamente. Selecione e copie manualmente.
            </p>
            <textarea
              readOnly
              rows={10}
              value={td.fallbackText}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 font-mono resize-none"
            />
            <button
              type="button"
              onClick={() => td.setFallbackText(null)}
              className="w-full rounded-xl bg-zinc-800 text-zinc-300 font-medium py-2.5 hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
