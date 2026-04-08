"use client";

import { TeamDrawNumericStepper } from "./TeamDrawNumericStepper";
import type { DrawMode } from "./useTeamDraw";

type Props = {
  open: boolean;
  onClose: () => void;
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
  controlsDisabled: boolean;
};

export function TeamDrawSettingsModal({
  open,
  onClose,
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
  controlsDisabled,
}: Props) {
  if (!open) return null;

  const sid = "team-draw-settings-balance";
  const nameDrawMode = "draw-mode-settings-modal";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-draw-settings-title"
    >
      <div className="absolute inset-0 cursor-default" aria-hidden onClick={onClose} />
      <div
        className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="team-draw-settings-title" className="text-lg font-bold text-zinc-100">
            Opções do sorteio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              id={sid}
              aria-checked={balanceByOverall}
              aria-labelledby={`${sid}-label`}
              disabled={controlsDisabled}
              onClick={() => setBalanceByOverall(!balanceByOverall)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 disabled:opacity-50 ${
                balanceByOverall ? "bg-green-600" : "bg-zinc-600"
              }`}
            >
              <span
                className={`pointer-events-none absolute top-1 left-1 block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  balanceByOverall ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <p id={`${sid}-label`} className="min-w-0 flex-1 text-sm font-bold text-zinc-100">
              Balancear por overall
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-zinc-100">Modo para o próximo sorteio</legend>
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name={nameDrawMode}
                  checked={drawMode === "num_teams"}
                  onChange={() => setDrawMode("num_teams")}
                  disabled={controlsDisabled}
                  className="accent-green-500"
                />
                Por número de times
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name={nameDrawMode}
                  checked={drawMode === "ppt"}
                  onChange={() => setDrawMode("ppt")}
                  disabled={controlsDisabled}
                  className="accent-green-500"
                />
                Por jogadores por time
              </label>
            </div>
          </fieldset>

          {drawMode === "num_teams" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400" htmlFor="num-teams-settings-modal">
                Número de times
                <span className="font-normal text-zinc-500"> (mínimo 2)</span>
              </label>
              <TeamDrawNumericStepper
                id="num-teams-settings-modal"
                value={numTeams}
                onChange={setNumTeams}
                min={2}
                max={99}
                disabled={controlsDisabled}
              />
              {numTeamsError && <p className="mt-1 text-xs text-red-400">{numTeamsError}</p>}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400" htmlFor="ppt-settings-modal">
                Jogadores por time
                <span className="font-normal text-zinc-500"> (mínimo 2)</span>
              </label>
              <TeamDrawNumericStepper
                id="ppt-settings-modal"
                value={pptPlayers}
                onChange={setPptPlayers}
                min={2}
                max={99}
                disabled={controlsDisabled}
              />
              {pptError && <p className="mt-1 text-xs text-red-400">{pptError}</p>}
            </div>
          )}

          <button
            type="button"
            data-testid="team-draw-settings-close-footer"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
