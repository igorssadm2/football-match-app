"use client";

import type { DrawMode } from "./useTeamDraw";
import { TeamDrawNumericStepper } from "./TeamDrawNumericStepper";

type Props = {
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
  submitting: boolean;
  canManage: boolean;
  onRealizarSorteio: () => void;
  /** ids for tests */
  idPrefix?: "empty" | "page";
};

export function TeamDrawConfigPanel({
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
  submitting,
  canManage,
  onRealizarSorteio,
  idPrefix = "empty",
}: Props) {
  const sid = `team-draw-balance-${idPrefix}`;
  const nameDrawMode = `draw-mode-${idPrefix}`;
  const numId = idPrefix === "empty" ? "num-teams-input-empty" : "team-draw-num-teams-page";
  const pptId = idPrefix === "empty" ? "ppt-input-empty" : "team-draw-ppt-page";

  return (
    <div className="space-y-5">
      {canManage ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              id={sid}
              aria-checked={balanceByOverall}
              aria-labelledby={`${sid}-label`}
              disabled={submitting}
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
            <p id={`${sid}-label`} className="text-sm font-bold text-zinc-100 min-w-0 flex-1">
              Balancear por overall
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-zinc-100">Modo de sorteio</p>
            <p className="text-sm font-normal text-zinc-500 -mt-1">
              Defina se o algoritmo parte do número de times ou de quantos jogadores cabem em cada time.
            </p>
            <fieldset className="space-y-2">
              <legend className="sr-only">Modo de sorteio</legend>
              <label className="flex cursor-pointer items-start gap-3 py-1.5">
                <input
                  type="radio"
                  name={nameDrawMode}
                  checked={drawMode === "num_teams"}
                  onChange={() => setDrawMode("num_teams")}
                  className="mt-1 accent-green-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-100">Por número de times</span>
                  <span className="block text-sm font-normal text-zinc-500 mt-0.5">
                    Você escolhe quantos times (ex.: 4 times); a distribuição segue esse total.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 py-1.5">
                <input
                  type="radio"
                  name={nameDrawMode}
                  checked={drawMode === "ppt"}
                  onChange={() => setDrawMode("ppt")}
                  className="mt-1 accent-green-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-100">Por jogadores por time</span>
                  <span className="block text-sm font-normal text-zinc-500 mt-0.5">
                    Você define quantos jogadores por time; o sistema calcula quantos times cabem.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          {drawMode === "num_teams" ? (
            <div>
              <label className="block text-sm font-bold text-zinc-100 mb-1" htmlFor={numId}>
                Número de times{" "}
                <span className="font-normal text-zinc-500">(mínimo 2)</span>
              </label>
              <TeamDrawNumericStepper
                id={numId}
                value={numTeams}
                onChange={setNumTeams}
                min={2}
                max={99}
                disabled={submitting}
              />
              {numTeamsError && <p className="text-xs text-red-400 mt-1">{numTeamsError}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-zinc-100 mb-1" htmlFor={pptId}>
                Jogadores por time{" "}
                <span className="font-normal text-zinc-500">(mínimo 2)</span>
              </label>
              <TeamDrawNumericStepper
                id={pptId}
                value={pptPlayers}
                onChange={setPptPlayers}
                min={2}
                max={99}
                disabled={submitting}
              />
              {pptError && <p className="text-xs text-red-400 mt-1">{pptError}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={() => onRealizarSorteio()}
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-zinc-950 px-4 py-3 text-sm font-bold"
          >
            {submitting ? "Sorteando..." : "Realizar sorteio"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Aguarde um organizador realizar o sorteio.</p>
      )}
    </div>
  );
}
