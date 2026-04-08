import type { SkillDefinition } from "@/types/pregame";

/** IDs obrigatórios de métricas de futebol (alinhados a GET /api/v1/skills/football). */
export const FOOTBALL_SKILL_IDS = [
  "finishing",
  "passing",
  "ball_control",
  "positioning",
  "physicality",
] as const;

export type FootballSkillId = (typeof FOOTBALL_SKILL_IDS)[number];

export function footballSkillIdsFromDefinitions(defs: SkillDefinition[]): string[] {
  return defs.map((d) => d.id);
}

export function hasAllFootballSkillDefinitions(defs: SkillDefinition[]): boolean {
  const ids = new Set(defs.map((d) => d.id));
  return FOOTBALL_SKILL_IDS.every((id) => ids.has(id));
}

function clampIntRating(v: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Monta mapa completo skill_id → nota inteira dentro dos limites de cada definição. */
export function buildCompleteFootballSkillRatings(
  defs: SkillDefinition[],
  ratings: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of FOOTBALL_SKILL_IDS) {
    const def = defs.find((d) => d.id === id);
    if (!def) continue;
    const raw = ratings[id];
    const fallback = Math.round((def.min_value + def.max_value) / 2);
    const base = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
    out[id] = clampIntRating(base, def.min_value, def.max_value);
  }
  return out;
}

export function skillRatingsFromManualAttributes(
  attrs: Record<string, unknown> | undefined
): Record<string, number> {
  if (!attrs || typeof attrs !== "object") return {};
  const sr = attrs.skill_ratings;
  if (!sr || typeof sr !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(sr as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v);
  }
  return out;
}

export function isCompleteFootballSkillRatings(
  ratings: Record<string, number>,
  defs: SkillDefinition[]
): boolean {
  if (!hasAllFootballSkillDefinitions(defs)) return false;
  for (const id of FOOTBALL_SKILL_IDS) {
    const def = defs.find((d) => d.id === id);
    if (!def) return false;
    const v = ratings[id];
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    if (v < def.min_value || v > def.max_value) return false;
  }
  return true;
}
