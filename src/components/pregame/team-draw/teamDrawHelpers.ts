import type { TeamDrawResponse } from "@/types/pregame";

/** Sempre enviado no POST — sem opção na UI; algoritmo distribui GK entre times quando aplicável. */
export const BALANCE_GOALKEEPERS_DEFAULT = true;

/** 2xx inclui 201 Created do POST de sorteio; não usar apenas status === 200. */
export function isSuccessResponse(res: Response) {
  return res.ok;
}

export function parseTeamDrawPayload(data: unknown): TeamDrawResponse | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<TeamDrawResponse>;
  if (!Array.isArray(d.teams)) return null;
  if (typeof d.draw_run_id !== "string" || typeof d.pregame_id !== "string") return null;
  const balance =
    typeof d.balance_by_overall === "boolean" ? d.balance_by_overall : true;
  const balanceGk =
    typeof d.balance_goalkeepers === "boolean" ? d.balance_goalkeepers : false;
  const isConfirmed = typeof d.is_confirmed === "boolean" ? d.is_confirmed : false;
  return {
    draw_run_id: d.draw_run_id,
    pregame_id: d.pregame_id,
    num_teams: typeof d.num_teams === "number" ? d.num_teams : d.teams.length,
    seed_used: typeof d.seed_used === "number" ? d.seed_used : 0,
    balance_by_overall: balance,
    balance_goalkeepers: balanceGk,
    is_confirmed: isConfirmed,
    confirmed_at: d.confirmed_at ?? null,
    players_per_team:
      d.players_per_team === undefined || d.players_per_team === null
        ? null
        : typeof d.players_per_team === "number"
          ? d.players_per_team
          : null,
    teams: d.teams,
  };
}
