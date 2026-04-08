"use client";

import { useState } from "react";
import type { TeamDrawResponse } from "@/types/pregame";
import { MoveTeamModal } from "./MoveTeamModal";
import { TeamDrawSettingsModal } from "./TeamDrawSettingsModal";
import type { DrawMode } from "./useTeamDraw";

type Props = {
  draw: TeamDrawResponse;
  canManage: boolean;
  submitting: boolean;
  confirming: boolean;
  copying: boolean;
  movingParticipantId: string | null;
  balanceByOverall: boolean;
  setBalanceByOverall: (v: boolean) => void;
  drawMode: DrawMode;
  setDrawMode: (m: DrawMode) => void;
  numTeams: number;
  setNumTeams: (n: number) => void;
  pptPlayers: number;
  setPptPlayers: (n: number) => void;
  numTeamsError: string | null;
  pptError: string | null;
  drawControlsDisabled: boolean;
  onRessortear: () => void;
  onConfirmarTimes: () => void;
  onCopyWhatsapp?: () => void;
  /** Se false, oculta o botão de WhatsApp (fluxo pós-confirmação na criação da partida). */
  showCopyWhatsApp?: boolean;
  moveParticipant: (participantId: string, fromTeamId: string, targetTeamId: string) => void;
  swapParticipants: (participantIdA: string, fromTeamIdA: string, participantIdB: string, fromTeamIdB: string) => void;
  /** Barra superior fixa com Ressortear + Confirmar (telas dedicadas). */
  stickyActions?: boolean;
  /**
   * Com sorteio confirmado, mostra Ressortear + engrenagem (fluxo `?resort=1` para administrador).
   */
  showDraftControlsWhenConfirmed?: boolean;
};

export function TeamDrawResultPanel({
  draw,
  canManage,
  submitting,
  confirming,
  copying,
  movingParticipantId,
  balanceByOverall,
  setBalanceByOverall,
  drawMode,
  setDrawMode,
  numTeams,
  setNumTeams,
  pptPlayers,
  setPptPlayers,
  numTeamsError,
  pptError,
  drawControlsDisabled,
  onRessortear,
  onConfirmarTimes,
  onCopyWhatsapp,
  showCopyWhatsApp = true,
  moveParticipant,
  swapParticipants,
  stickyActions = false,
  showDraftControlsWhenConfirmed = false,
}: Props) {
  const [moveModal, setMoveModal] = useState<{
    participantId: string;
    fromTeamId: string;
    playerName: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const busyMove = !!movingParticipantId;

  function openMove(p: { participant_id: string; name: string }, teamId: string) {
    setMoveModal({ participantId: p.participant_id, fromTeamId: teamId, playerName: p.name });
  }

  const copyBtn =
    showCopyWhatsApp && onCopyWhatsapp ? (
      <button
        type="button"
        onClick={() => onCopyWhatsapp()}
        disabled={copying}
        className="min-h-[44px] w-full sm:w-auto sm:flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-60"
      >
        {copying ? "Copiando..." : "Copiar para WhatsApp"}
      </button>
    ) : null;

  const actionWrapCls = stickyActions
    ? "sticky top-0 z-30 -mx-1 px-1 py-3 mb-4 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md"
    : "mb-4";

  const showDraftBar =
    canManage && (!draw.is_confirmed || showDraftControlsWhenConfirmed);
  const hasTopActions = showDraftBar || !!copyBtn;

  const actionRow = hasTopActions ? (
    <div className={actionWrapCls}>
      <div className="flex flex-col gap-2">
        {showDraftBar && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="flex min-w-0 gap-2 sm:max-w-[min(100%,13rem)] sm:shrink-0">
              <button
                type="button"
                onClick={() => onRessortear()}
                disabled={drawControlsDisabled}
                className="min-h-[40px] flex-1 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-60"
              >
                {submitting ? "Sorteando..." : "Ressortear"}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                disabled={drawControlsDisabled}
                aria-label="Opções do sorteio"
                title="Opções do sorteio"
                className="flex h-[40px] w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
            {!draw.is_confirmed && (
              <button
                type="button"
                onClick={() => onConfirmarTimes()}
                disabled={confirming || submitting}
                className="min-h-[48px] w-full rounded-xl bg-green-500 px-6 py-3 text-base font-bold text-zinc-950 hover:bg-green-400 disabled:opacity-60 sm:min-h-[44px] sm:flex-1 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {confirming ? "Confirmando..." : "Confirmar times"}
              </button>
            )}
          </div>
        )}
        {copyBtn}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {actionRow}

      {draw.is_confirmed && !showDraftControlsWhenConfirmed && (
        <p className="text-xs text-zinc-500">
          Ressortear não está disponível após confirmar. Ainda é possível mover jogadores entre times.
        </p>
      )}

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-2 text-[11px] text-zinc-500">
        <p>
          Times: <span className="text-zinc-300 font-semibold">{draw.num_teams}</span>
          {draw.players_per_team != null && (
            <>
              {" "}
              · Jogadores por time (rodada):{" "}
              <span className="text-zinc-300 font-semibold">{draw.players_per_team}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
        {draw.teams.map((team) => {
          const n = team.players.length;
          const avgOverall =
            n > 0 ? team.players.reduce((sum, p) => sum + p.overall, 0) / n : null;

          return (
            <article
              key={`${draw.draw_run_id}-${team.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
            >
              <h3 className="mb-1.5 text-sm font-bold text-zinc-100">{team.name}</h3>
              <ul className="divide-y divide-zinc-800/80">
                {team.players.map((player, idx) => (
                  <li
                    key={player.participant_id}
                    className="flex items-center justify-between gap-2 py-1 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="mr-1.5 tabular-nums text-[11px] font-medium text-zinc-500">
                        {idx + 1}.
                      </span>
                      <span className="text-[15px] font-semibold text-zinc-100">{player.name}</span>
                      <span className="ml-1.5 text-xs text-zinc-500">· {player.overall}</span>
                    </span>
                    {canManage && draw.teams.length > 1 && (
                      <button
                        type="button"
                        disabled={busyMove}
                        onClick={() => openMove(player, team.id)}
                        aria-label={`Mover ${player.name} para outro time`}
                        title="Mover para outro time"
                        className="shrink-0 rounded-md p-1.5 text-green-500 transition-colors hover:bg-green-500/10 hover:text-green-400 active:bg-green-500/15 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 5v14M8 9l4-4 4 4M8 15l4 4 4-4" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {avgOverall != null && (
                <p className="mt-2 border-t border-zinc-800/80 pt-2 text-xs text-zinc-400">
                  Média do overall do time:{" "}
                  <span className="font-semibold tabular-nums text-zinc-300">
                    {avgOverall.toFixed(1)}
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      <TeamDrawSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        balanceByOverall={balanceByOverall}
        setBalanceByOverall={setBalanceByOverall}
        drawMode={drawMode}
        setDrawMode={setDrawMode}
        numTeams={numTeams}
        setNumTeams={setNumTeams}
        pptPlayers={pptPlayers}
        setPptPlayers={setPptPlayers}
        numTeamsError={numTeamsError}
        pptError={pptError}
        controlsDisabled={drawControlsDisabled}
      />

      <MoveTeamModal
        open={moveModal !== null}
        playerName={moveModal?.playerName ?? ""}
        playerParticipantId={moveModal?.participantId ?? ""}
        teams={draw.teams}
        currentTeamId={moveModal?.fromTeamId ?? ""}
        playersPerTeam={draw.players_per_team}
        onClose={() => setMoveModal(null)}
        busy={busyMove}
        onSelectTeam={(targetId) => {
          if (!moveModal) return;
          void moveParticipant(moveModal.participantId, moveModal.fromTeamId, targetId);
          setMoveModal(null);
        }}
        onSwapWithPlayer={(swapParticipantId, swapTeamId) => {
          if (!moveModal) return;
          void swapParticipants(
            moveModal.participantId,
            moveModal.fromTeamId,
            swapParticipantId,
            swapTeamId,
          );
          setMoveModal(null);
        }}
      />
    </div>
  );
}
