/**
 * Remove o sorteio no servidor (DELETE /team-draw).
 * Sucesso: **204** (ou 200). Com backend atual, criador do pré-jogo ou admin do grupo pode remover
 * também sorteio **confirmado** (pré-jogo aberto), desde que o servidor aceite o DELETE.
 * `kind: "confirmed_block"` fica como fallback para respostas antigas ou edge cases.
 */
export type DiscardTeamDrawResult =
  | { ok: true }
  | { ok: false; message: string; kind?: "confirmed_block" };

export async function discardTeamDrawDraft(pregameId: string): Promise<DiscardTeamDrawResult> {
  const res = await fetch(`/api/pregames/${pregameId}/team-draw`, {
    method: "DELETE",
    cache: "no-store",
  });

  const status = res.status;
  if (status === 204 || status === 200 || res.ok) {
    return { ok: true };
  }

  const raw = await res.text().catch(() => "");
  let data: { message?: string; title?: string } = {};
  try {
    if (raw) data = JSON.parse(raw) as typeof data;
  } catch {
    /* ignore */
  }

  const combined = `${data.message ?? ""} ${data.title ?? ""}`.trim();
  const combinedLower = combined.toLowerCase();

  const alreadyGone =
    status === 404 ||
    combinedLower.includes("no current draw") ||
    combinedLower.includes("não há sorteio") ||
    combinedLower.includes("nothing to discard") ||
    combinedLower.includes("nenhum sorteio");

  if (alreadyGone) {
    return { ok: true };
  }

  const confirmedBlock =
    combinedLower.includes("already confirmed") ||
    combinedLower.includes("cannot discard") ||
    combinedLower.includes("team draw is already confirmed");

  if (confirmedBlock) {
    return {
      ok: false,
      kind: "confirmed_block",
      message:
        "Não foi possível remover o sorteio para recomeçar (por exemplo, sorteio ainda marcado como confirmado no servidor). Você pode tentar de novo ou ajustar os times movendo jogadores entre times.",
    };
  }

  return {
    ok: false,
    message: data.message ?? data.title ?? "Não foi possível descartar o sorteio.",
  };
}
