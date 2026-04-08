type TeamDrawErrorSource =
  | "get_draw"
  | "create_draw"
  | "whatsapp_text"
  | "confirm_draw"
  | "patch_assignments";

export type TeamDrawErrorKind =
  | "no_draw_yet"
  | "forbidden"
  | "num_teams_out_of_range"
  | "players_per_team_too_large"
  | "no_confirmed_participants"
  | "pregame_not_open"
  | "sport_not_supported"
  | "min_confirmed_not_reached"
  | "metrics_inconsistency"
  | "draw_already_confirmed"
  | "confirm_already_confirmed"
  | "move_participant_invalid"
  | "move_destination_full"
  | "server_error"
  | "not_found"
  | "unknown";

export interface TeamDrawErrorUi {
  kind: TeamDrawErrorKind;
  message: string;
  field?: "num_teams" | "players_per_team";
  retryable?: boolean;
  /** Em 422, IDs de `pregame_participants` afetados (para destacar na lista). */
  participantIds?: string[];
}

function parseTeamDrawValidationErrors(data: Record<string, unknown>): {
  generalMessage: string;
  participantIds: string[];
} {
  const raw = data.errors;
  let generalMessage = "";
  const participantIds: string[] = [];

  if (raw && typeof raw === "object") {
    const err = raw as Record<string, unknown>;
    const g = err.general;
    if (Array.isArray(g)) {
      generalMessage = g.filter((x) => typeof x === "string").join(" ");
    } else if (typeof g === "string") {
      generalMessage = g;
    }
    const p = err.participant_ids;
    if (Array.isArray(p)) {
      for (const x of p) {
        if (typeof x === "string") participantIds.push(x);
      }
    }
  }

  return { generalMessage: generalMessage.trim(), participantIds };
}

/** Mensagens fixas em português — não repassamos `data.message` da API (costuma vir em inglês/técnico). */
const PT = {
  numTeamsRange:
    "Esse número de times não combina com a quantidade de confirmados. Tente menos times ou espere mais confirmações.",
  playersPerTeamLarge:
    "Jogadores por time é alto demais para a quantidade de confirmados. Reduza o valor ou espere mais confirmações.",
  drawConfirmedNoReshuffle:
    "Os times já foram confirmados. Não dá para sortear de novo — use “Mover” se precisar ajustar.",
  alreadyConfirmed: "Este sorteio já estava confirmado.",
  moveDestFull: "Esse time já está cheio.",
  moveInvalid: "Não foi possível mover este jogador. Confira o time de destino.",
  genericOperation: "Não foi possível concluir esta ação. Tente de novo.",
} as const;

function messageOrGeneric(apiMessage: string, fallback: string): string {
  const t = apiMessage.trim();
  if (!t) return fallback;
  const looksTechnical =
    /num_teams|players_per_team|out of valid|out of range|invalid (_|\s)|is not |must be /i.test(t) ||
    (/^[a-z][a-z0-9_]*(\s|$)/.test(t) && !/[áàâãéêíóôõúç]/i.test(t));
  return looksTechnical ? fallback : t;
}

export function mapTeamDrawError(
  status: number,
  data: Record<string, unknown>,
  source: TeamDrawErrorSource
): TeamDrawErrorUi {
  const code = typeof data.code === "string" ? data.code : "";
  const message = typeof data.message === "string" ? data.message : "";

  if (source === "get_draw" && status === 404) {
    return { kind: "no_draw_yet", message: "Ainda não há sorteio para este pré-jogo." };
  }

  if (status === 403) {
    return { kind: "forbidden", message: "Você não tem permissão para sortear." };
  }

  if (status === 404) {
    if (source === "confirm_draw") {
      return { kind: "not_found", message: "Não há sorteio atual para confirmar." };
    }
    return { kind: "not_found", message: "Pré-jogo não encontrado." };
  }

  if (status === 409) {
    if (source === "create_draw") {
      return {
        kind: "draw_already_confirmed",
        message: PT.drawConfirmedNoReshuffle,
      };
    }
    if (source === "confirm_draw") {
      return {
        kind: "confirm_already_confirmed",
        message: PT.alreadyConfirmed,
      };
    }
  }

  if (status === 400 && code === "team_draw_num_teams_out_of_range") {
    return {
      kind: "num_teams_out_of_range",
      message: PT.numTeamsRange,
      field: "num_teams",
    };
  }

  if (status === 400 && code === "team_draw_players_per_team_too_large") {
    return {
      kind: "players_per_team_too_large",
      message: PT.playersPerTeamLarge,
      field: "players_per_team",
    };
  }

  if (status === 400 && code === "team_draw_no_confirmed_participants") {
    return {
      kind: "no_confirmed_participants",
      message: "Sem confirmados para sortear.",
    };
  }

  if (status === 400 && code === "team_draw_pregame_not_open") {
    return {
      kind: "pregame_not_open",
      message: "O sorteio só pode ser feito quando o pré-jogo está aberto.",
    };
  }

  if (status === 400 && code === "team_draw_sport_not_supported") {
    return {
      kind: "sport_not_supported",
      message: "Sorteio de times disponível na v1 apenas para futebol.",
    };
  }

  if (status === 400 && code === "team_draw_min_confirmed_not_reached") {
    return {
      kind: "min_confirmed_not_reached",
      message: "Quantidade mínima de confirmados não atingida. Deseja continuar mesmo assim?",
    };
  }

  if (source === "patch_assignments" && status === 400) {
    if (code === "team_draw_move_destination_team_full") {
      return {
        kind: "move_destination_full",
        message: PT.moveDestFull,
      };
    }
    if (
      code === "team_draw_move_participant_not_in_draw" ||
      code === "team_draw_move_target_team_invalid"
    ) {
      return {
        kind: "move_participant_invalid",
        message: PT.moveInvalid,
      };
    }
  }

  if (status === 422) {
    const { generalMessage, participantIds } = parseTeamDrawValidationErrors(data);
    const merged = generalMessage || message;
    return {
      kind: "metrics_inconsistency",
      message: messageOrGeneric(
        merged,
        "Alguns dados dos jogadores não batem com o esperado. Revise as métricas e tente de novo."
      ),
      ...(participantIds.length ? { participantIds } : {}),
    };
  }

  if (status >= 500) {
    return {
      kind: "server_error",
      message: "Erro inesperado ao processar o sorteio. Tente novamente.",
      retryable: true,
    };
  }

  return {
    kind: "unknown",
    message: messageOrGeneric(message, PT.genericOperation),
  };
}
