/** Mapeia respostas de erro de POST /pregames/:id/guests (PRD §7). */

export type AddGuestErrorUi = {
  toastMessage: string;
  /** Mensagem curta para campo nome (modo rápido) */
  inlineHint?: string;
  /** Dica para bloco de métricas (422 skill_ratings etc.) */
  skillRatingsHint?: string;
};

function firstErrorString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v;
  if (Array.isArray(v)) {
    const s = v.find((x) => typeof x === "string" && x.trim());
    return typeof s === "string" ? s : undefined;
  }
  return undefined;
}

/** Formata objeto `errors` do backend (422) em texto legível. */
function formatValidationErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];
  const parts: string[] = [];
  for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
    if (val === null || val === undefined) continue;
    if (typeof val === "string") {
      parts.push(`${key}: ${val}`);
      continue;
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") parts.push(`${key}: ${item}`);
        else if (item && typeof item === "object") {
          parts.push(`${key}: ${JSON.stringify(item)}`);
        }
      }
      continue;
    }
    if (typeof val === "object") {
      for (const [ik, iv] of Object.entries(val as Record<string, unknown>)) {
        const sub = firstErrorString(iv) ?? (typeof iv === "object" ? JSON.stringify(iv) : String(iv));
        parts.push(`${key}.${ik}: ${sub}`);
      }
    }
  }
  return parts;
}

export function mapAddGuestError(status: number, data: Record<string, unknown>): AddGuestErrorUi {
  const message = typeof data.message === "string" ? data.message : "";
  const code = typeof data.code === "string" ? data.code : "";

  if (status === 401) {
    return { toastMessage: "Faça login para continuar." };
  }
  if (status === 403) {
    return { toastMessage: "Você não tem permissão para adicionar convidados." };
  }
  if (status === 404) {
    const resource = data.resource;
    if (resource === "manual_profile") {
      return { toastMessage: "Perfil manual não encontrado." };
    }
    return { toastMessage: message || "Recurso não encontrado." };
  }
  if (status === 409) {
    return { toastMessage: "Este jogador já está neste pré-jogo." };
  }
  if (status === 422) {
    const errors = data.errors;
    const parts = formatValidationErrors(errors);
    if (parts.length) {
      const errObj = errors && typeof errors === "object" ? (errors as Record<string, unknown>) : {};
      const displayNameErr =
        firstErrorString(errObj.display_name) ?? firstErrorString(errObj.guest_name);
      const skillErr = skillRatingsErrorHint(errObj.skill_ratings);
      return {
        toastMessage: parts.join(" "),
        ...(displayNameErr ? { inlineHint: displayNameErr } : {}),
        ...(skillErr ? { skillRatingsHint: skillErr } : {}),
      };
    }
    const lower = message.toLowerCase();
    if (
      lower.includes("cheio") ||
      lower.includes("lista de espera") ||
      lower.includes("waiting") ||
      lower.includes("full") ||
      lower.includes("capacity")
    ) {
      return { toastMessage: message || "O jogo está cheio e não há lista de espera." };
    }
    return {
      toastMessage: message || "Dados inválidos. Ajuste o formulário (não combine perfil salvo com nome).",
    };
  }
  if (status === 400) {
    if (code === "manual_profile_group_mismatch") {
      return { toastMessage: "Este perfil não pertence a este grupo." };
    }
    if (code === "group_sport_not_set") {
      return { toastMessage: "Configure o esporte do grupo antes de usar métricas." };
    }
    return {
      toastMessage: message || "Não foi possível adicionar o convidado.",
      inlineHint: message.includes("nome") || lowerNameHint(message) ? "Verifique o nome." : undefined,
    };
  }
  if (status >= 500) {
    return { toastMessage: "Servidor indisponível. Tente novamente em instantes." };
  }
  return { toastMessage: message || "Erro ao adicionar convidado." };
}

function lowerNameHint(m: string) {
  const l = m.toLowerCase();
  return l.includes("vazio") || l.includes("obrigatório") || l.includes("guest");
}

function skillRatingsErrorHint(val: unknown): string | undefined {
  if (typeof val === "string" && val.trim()) return val;
  const fromArr = firstErrorString(val);
  if (fromArr) return fromArr;
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const lines: string[] = [];
    for (const [k, iv] of Object.entries(val as Record<string, unknown>)) {
      const s = firstErrorString(iv);
      if (s) lines.push(`${k}: ${s}`);
    }
    if (lines.length) return lines.join(" ");
  }
  return undefined;
}
