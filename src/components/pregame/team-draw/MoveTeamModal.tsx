"use client";

import { useState } from "react";
import type { TeamDrawTeam } from "@/types/pregame";

type Props = {
  open: boolean;
  playerName: string;
  playerParticipantId: string;
  teams: TeamDrawTeam[];
  currentTeamId: string;
  /** Limite de jogadores por time (rodada). Quando definido, times cheios oferecem troca. */
  playersPerTeam?: number | null;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
  onSwapWithPlayer: (swapParticipantId: string, swapTeamId: string) => void;
  busy?: boolean;
};

export function MoveTeamModal({
  open,
  playerName,
  playerParticipantId,
  teams,
  currentTeamId,
  playersPerTeam,
  onClose,
  onSelectTeam,
  onSwapWithPlayer,
  busy,
}: Props) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  if (!open) return null;

  const options = teams.filter((t) => t.id !== currentTeamId);

  function isFull(team: TeamDrawTeam) {
    return playersPerTeam != null && team.players.length >= playersPerTeam;
  }

  function handleTeamClick(team: TeamDrawTeam) {
    if (busy) return;
    if (isFull(team)) {
      setExpandedTeamId((prev) => (prev === team.id ? null : team.id));
    } else {
      onSelectTeam(team.id);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-team-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="move-team-modal-title" className="text-base font-bold text-zinc-100 pr-8">
          Mover jogador
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5 mb-4">
          <span className="font-medium text-zinc-300">{playerName}</span>
        </p>

        <div className="flex flex-col gap-2">
          {options.map((team) => {
            const full = isFull(team);
            const expanded = expandedTeamId === team.id;

            return (
              <div key={team.id} className="overflow-hidden rounded-xl border border-zinc-700">
                {/* Team header */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleTeamClick(team)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                    full
                      ? "bg-zinc-800/60 hover:bg-zinc-800"
                      : "bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-zinc-100 block">{team.name}</span>
                    {full && (
                      <span className="text-[11px] text-zinc-500">
                        {expanded ? "Escolha quem trocar" : "Time cheio — clique para trocar"}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {!full && (
                      <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                        Mover aqui
                      </span>
                    )}
                    {full && (
                      <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Players list for swap — only shown when expanded */}
                {full && expanded && (
                  <ul className="divide-y divide-zinc-800/80 border-t border-zinc-800/80">
                    {team.players
                      .filter((p) => p.participant_id !== playerParticipantId)
                      .map((player) => (
                        <li key={player.participant_id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onSwapWithPlayer(player.participant_id, team.id)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
                          >
                            <span className="text-sm font-medium text-zinc-200">{player.name}</span>
                            <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                              overall {player.overall}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
