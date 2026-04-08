"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AddGuestResponse,
  ManualPlayerItem,
  ManualPlayersListResponse,
  SkillDefinition,
} from "@/types/pregame";
import { mapAddGuestError } from "@/lib/mapAddGuestError";
import {
  buildCompleteFootballSkillRatings,
  hasAllFootballSkillDefinitions,
  isCompleteFootballSkillRatings,
  skillRatingsFromManualAttributes,
} from "@/lib/footballSkills";

/** Duas telas: novo jogador (nome + métricas) | jogadores recentes do grupo */
type GuestMode = "new_with_metrics" | "recent_players";

const PAGE_SIZE = 30;
const inputCls =
  "w-full min-h-[44px] rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50";

function defaultRating(s: SkillDefinition): number {
  return Math.round((s.min_value + s.max_value) / 2);
}

export function AddGuestSheet({
  open,
  onClose,
  pregameId,
  groupId,
  onSuccess,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  pregameId: string;
  groupId: string;
  onSuccess: () => void | Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [mode, setMode] = useState<GuestMode>("new_with_metrics");
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [skillRatingsError, setSkillRatingsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [skillDefs, setSkillDefs] = useState<SkillDefinition[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});

  const [manualItems, setManualItems] = useState<ManualPlayerItem[]>([]);
  const [manualOffset, setManualOffset] = useState(0);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualHasMore, setManualHasMore] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<ManualPlayerItem | null>(null);
  const [showSkillTweak, setShowSkillTweak] = useState(false);
  /** Omitir no POST para "campo"; enviar `goalkeeper` para goleiro (sorteio GK). */
  const [preferredRole, setPreferredRole] = useState<"field" | "goalkeeper">("field");

  const resetForm = useCallback(() => {
    setDisplayName("");
    setNameError(null);
    setSkillRatingsError(null);
    setSkillRatings({});
    setSelectedProfile(null);
    setManualItems([]);
    setManualOffset(0);
    setManualHasMore(true);
    setShowSkillTweak(false);
    setPreferredRole("field");
    setMode("new_with_metrics");
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, resetForm]);

  const loadSkills = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const res = await fetch("/api/skills/football");
      if (!res.ok) return;
      const data = (await res.json()) as unknown;
      setSkillDefs(Array.isArray(data) ? (data as SkillDefinition[]) : []);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadSkills();
  }, [open, loadSkills]);

  useEffect(() => {
    if (skillDefs.length === 0) return;
    setSkillRatings((prev) => {
      const next = { ...prev };
      for (const s of skillDefs) {
        if (next[s.id] === undefined) next[s.id] = defaultRating(s);
      }
      return next;
    });
  }, [skillDefs]);

  const fetchManualPage = useCallback(
    async (offset: number, append: boolean) => {
      setManualLoading(true);
      try {
        const res = await fetch(
          `/api/groups/${groupId}/manual-players?limit=${PAGE_SIZE}&offset=${offset}`
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const ui = mapAddGuestError(res.status, data);
          showToast(ui.toastMessage);
          return;
        }
        const data = (await res.json()) as ManualPlayersListResponse;
        const items = data.items ?? [];
        if (append) setManualItems((prev) => [...prev, ...items]);
        else setManualItems(items);
        setManualHasMore(items.length >= PAGE_SIZE);
        setManualOffset(offset + items.length);
      } finally {
        setManualLoading(false);
      }
    },
    [groupId, showToast]
  );

  useEffect(() => {
    if (!open || mode !== "recent_players") return;
    setManualItems([]);
    setManualOffset(0);
    setManualHasMore(true);
    setSelectedProfile(null);
    void fetchManualPage(0, false);
  }, [open, mode, fetchManualPage]);

  function setRating(id: string, value: number) {
    setSkillRatingsError(null);
    setSkillRatings((prev) => ({ ...prev, [id]: value }));
  }

  async function submitBody(body: Record<string, unknown>) {
    setSubmitting(true);
    setNameError(null);
    setSkillRatingsError(null);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const ui = mapAddGuestError(res.status, data);
        if (mode === "new_with_metrics" && ui.inlineHint) setNameError(ui.inlineHint);
        if (ui.skillRatingsHint) setSkillRatingsError(ui.skillRatingsHint);
        showToast(ui.toastMessage);
        return;
      }
      const ok = data as unknown as AddGuestResponse;
      showToast(
        ok.status === "confirmed" ? "Convidado adicionado" : "Convidado na lista de espera"
      );
      await onSuccess();
      onClose();
    } catch {
      showToast("Erro de conexão ao adicionar convidado.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitNewWithMetrics() {
    const n = displayName.trim();
    if (!n) {
      setNameError("Nome do jogador é obrigatório");
      return;
    }
    if (!skillsLoading && skillDefs.length === 0) {
      showToast("Não há métricas de futebol cadastradas. Contate o suporte.");
      return;
    }
    if (skillsLoading) {
      showToast("Aguarde o carregamento das métricas.");
      return;
    }
    if (!hasAllFootballSkillDefinitions(skillDefs)) {
      showToast(
        "Definições de habilidades incompletas no servidor. São necessárias: finalização, passe, condução, posicionamento e físico."
      );
      return;
    }
    const skill_ratings = buildCompleteFootballSkillRatings(skillDefs, skillRatings);
    const body: Record<string, unknown> = {
      display_name: n,
      skill_ratings,
      ...(preferredRole === "goalkeeper" ? { preferred_position: "goalkeeper" } : {}),
    };
    void submitBody(body);
  }

  function handleSubmitRecent() {
    if (!selectedProfile) {
      showToast("Selecione um jogador da lista.");
      return;
    }
    if (skillsLoading) {
      showToast("Aguarde o carregamento das métricas.");
      return;
    }
    if (!hasAllFootballSkillDefinitions(skillDefs)) {
      showToast("Carregue as métricas de futebol antes de adicionar o jogador.");
      return;
    }
    const stored = skillRatingsFromManualAttributes(selectedProfile.attributes);
    const profileComplete = isCompleteFootballSkillRatings(stored, skillDefs);

    const body: Record<string, unknown> = { manual_profile_id: selectedProfile.id };
    if (!profileComplete || showSkillTweak) {
      body.skill_ratings = buildCompleteFootballSkillRatings(skillDefs, skillRatings);
    }
    if (preferredRole === "goalkeeper") {
      body.preferred_position = "goalkeeper";
    }
    void submitBody(body);
  }

  function selectProfile(p: ManualPlayerItem) {
    setSelectedProfile(p);
    setSkillRatings(skillRatingsFromManualAttributes(p.attributes));
    const stored = skillRatingsFromManualAttributes(p.attributes);
    const complete =
      skillDefs.length > 0 && isCompleteFootballSkillRatings(stored, skillDefs);
    setShowSkillTweak(!complete);
  }

  const modeTabs: { id: GuestMode; label: string; aria: string }[] = useMemo(
    () => [
      {
        id: "new_with_metrics",
        label: "Novo jogador",
        aria: "Cadastrar jogador com nome e métricas",
      },
      {
        id: "recent_players",
        label: "Jogadores recentes",
        aria: "Escolher entre jogadores já cadastrados no grupo",
      },
    ],
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-guest-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90dvh,720px)] w-full flex-col rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="add-guest-title" className="text-base font-bold text-zinc-100">
            Adicionar convidado
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-zinc-800/80 p-2">
          {modeTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.aria}
              onClick={() => {
                setMode(t.id);
                setNameError(null);
                setSkillRatingsError(null);
              }}
              className={`min-h-[44px] flex-1 rounded-lg px-2 text-xs font-semibold transition-colors sm:text-sm ${
                mode === t.id
                  ? "bg-green-500/15 text-green-200 ring-1 ring-green-500/40"
                  : "text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {mode === "new_with_metrics" && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="guest-display-name">
                  Nome do jogador
                </label>
                <input
                  id="guest-display-name"
                  className={inputCls}
                  placeholder="Ex.: Zé"
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameError(null);
                    setSkillRatingsError(null);
                  }}
                  autoFocus
                />
                {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Métricas (futebol)
                </p>
                {skillsLoading && (
                  <p className="text-sm text-zinc-500">Carregando métricas…</p>
                )}
                {!skillsLoading && skillDefs.length === 0 && (
                  <p className="text-sm text-amber-400/90">
                    Nenhuma métrica disponível para este esporte. Use a aba &quot;Jogadores recentes&quot; ou
                    cadastre skills no backend.
                  </p>
                )}
                {!skillsLoading && skillDefs.length > 0 && (
                  <div className="space-y-4">
                    {skillRatingsError && (
                      <p className="text-xs text-red-400">{skillRatingsError}</p>
                    )}
                    {skillDefs.map((s) => (
                      <div key={s.id} className="space-y-1">
                        <div className="flex justify-between gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-300">{s.name}</span>
                          <span className="tabular-nums text-green-400">
                            {skillRatings[s.id] ?? defaultRating(s)}
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label={s.name}
                          min={s.min_value}
                          max={s.max_value}
                          step={1}
                          value={skillRatings[s.id] ?? defaultRating(s)}
                          onChange={(e) => setRating(s.id, Number(e.target.value))}
                          className="min-h-[44px] w-full py-2 accent-green-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Posição preferida (opcional)
                </p>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Marque goleiro para o sorteio considerar balanceamento de GK quando ativado.
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="guest-pos-new"
                      checked={preferredRole === "field"}
                      onChange={() => setPreferredRole("field")}
                      className="accent-green-500"
                    />
                    Campo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="guest-pos-new"
                      checked={preferredRole === "goalkeeper"}
                      onChange={() => setPreferredRole("goalkeeper")}
                      className="accent-green-500"
                    />
                    Goleiro
                  </label>
                </div>
              </div>
            </div>
          )}

          {mode === "recent_players" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Jogadores que já entraram em partidas deste grupo. Toque em um para adicionar à lista —
                sem repetir o nome no mesmo envio.
              </p>
              <ul className="space-y-2">
                {manualItems.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectProfile(p)}
                      className={`flex min-h-[48px] w-full items-center rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selectedProfile?.id === p.id
                          ? "border-green-500/50 bg-green-500/10 text-green-100"
                          : "border-zinc-800 bg-zinc-950/50 text-zinc-200 hover:border-zinc-600"
                      }`}
                    >
                      <span className="truncate font-medium">{p.display_name}</span>
                      {p.sport && (
                        <span className="ml-2 shrink-0 text-[10px] uppercase text-zinc-500">
                          {p.sport}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {manualLoading && manualItems.length === 0 && (
                <p className="text-xs text-zinc-500">Carregando…</p>
              )}
              {manualHasMore && manualItems.length > 0 && (
                <button
                  type="button"
                  disabled={manualLoading}
                  onClick={() => void fetchManualPage(manualOffset, true)}
                  className="min-h-[44px] w-full rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {manualLoading ? "Carregando…" : "Carregar mais"}
                </button>
              )}
              {!manualLoading && manualItems.length === 0 && (
                <p className="text-xs text-zinc-500">
                  Ainda não há jogadores recentes neste grupo. Use &quot;Novo jogador&quot; para cadastrar com
                  métricas.
                </p>
              )}

              {selectedProfile && (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={showSkillTweak}
                    onChange={(e) => {
                      setShowSkillTweak(e.target.checked);
                      if (e.target.checked && skillDefs.length === 0) void loadSkills();
                    }}
                    className="rounded border-zinc-600 bg-zinc-800 text-green-500"
                  />
                  Ajustar métricas neste envio
                </label>
              )}

              {selectedProfile && showSkillTweak && (
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  {skillRatingsError && (
                    <p className="text-xs text-red-400">{skillRatingsError}</p>
                  )}
                  {skillsLoading && <p className="text-xs text-zinc-500">Carregando…</p>}
                  {!skillsLoading &&
                    skillDefs.map((s) => (
                      <div key={s.id} className="space-y-1">
                        <div className="flex justify-between gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-300">{s.name}</span>
                          <span>
                            {skillRatings[s.id] ?? defaultRating(s)}
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label={s.name}
                          min={s.min_value}
                          max={s.max_value}
                          step={1}
                          value={skillRatings[s.id] ?? defaultRating(s)}
                          onChange={(e) => setRating(s.id, Number(e.target.value))}
                          className="w-full accent-green-500"
                        />
                      </div>
                    ))}
                </div>
              )}

              {selectedProfile && (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Posição preferida (opcional)
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="guest-pos-recent"
                        checked={preferredRole === "field"}
                        onChange={() => setPreferredRole("field")}
                        className="accent-green-500"
                      />
                      Campo
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="guest-pos-recent"
                        checked={preferredRole === "goalkeeper"}
                        onChange={() => setPreferredRole("goalkeeper")}
                        className="accent-green-500"
                      />
                      Goleiro
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-800 p-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (mode === "new_with_metrics") handleSubmitNewWithMetrics();
              else handleSubmitRecent();
            }}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-green-500 font-bold text-zinc-950 hover:bg-green-400 disabled:opacity-50"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Confirmar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
