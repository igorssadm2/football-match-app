"use client";

import type { TeamDrawResponse } from "@/types/pregame";

type Props = {
  draw: TeamDrawResponse | null;
  /** true após o GET do sorteio terminar */
  resolved: boolean;
};

/**
 * Lista de times sorteados — só na partida após confirmação do sorteio (rascunho fica só na tela de sorteio).
 */
export function PregameTeamDrawSection({ draw, resolved }: Props) {
  const hasConfirmedDraw = draw != null && draw.teams.length > 0 && draw.is_confirmed;
  if (!resolved || !hasConfirmedDraw || !draw) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-2xl font-black tracking-tight text-zinc-100">Times sorteados</h3>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-2 text-[11px] text-zinc-500">
        <p>
          Times: <span className="font-semibold text-zinc-300">{draw.num_teams}</span>
          {draw.players_per_team != null && (
            <>
              {" "}
              · Jogadores por time (rodada):{" "}
              <span className="font-semibold text-zinc-300">{draw.players_per_team}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
        {draw.teams.map((team) => {
          const n = team.players.length;
          const avgOverall = n > 0
            ? team.players.reduce((sum, p) => sum + p.overall, 0) / n
            : null;

          return (
            <article
              key={`${draw.draw_run_id}-${team.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-bold text-zinc-100">{team.name}</h4>
                {avgOverall != null && (
                  <span className="text-xs tabular-nums font-semibold text-zinc-400">
                    ⌀ <span className="text-zinc-200">{avgOverall.toFixed(1)}</span>
                  </span>
                )}
              </div>
              <ul className="divide-y divide-zinc-800/80">
                {team.players.map((player, idx) => (
                  <li key={player.participant_id} className="py-1 first:pt-0 last:pb-0">
                    <span className="block min-w-0 leading-snug">
                      <span className="mr-1.5 tabular-nums text-[11px] font-medium text-zinc-500">
                        {idx + 1}.
                      </span>
                      <span className="text-[15px] font-semibold text-zinc-100">{player.name}</span>
                      <span className="ml-1.5 text-xs text-zinc-500">· {player.overall}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
