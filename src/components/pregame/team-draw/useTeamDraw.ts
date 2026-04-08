"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/contexts/ConfirmContext";
import { mapTeamDrawError } from "@/lib/mapTeamDrawError";
import type { TeamDrawCreateRequest, TeamDrawResponse } from "@/types/pregame";
import {
  BALANCE_GOALKEEPERS_DEFAULT,
  isSuccessResponse,
  parseTeamDrawPayload,
} from "./teamDrawHelpers";

export type DrawMode = "num_teams" | "ppt";

export type UseTeamDrawOptions = {
  pregameId: string;
  canManage: boolean;
  pregamePlayersPerTeam?: number | null;
  suggestedPlayersPerTeam?: number | null;
  /**
   * Quantidade de confirmados (ex.: do GET participants). Usado no modo “N times” para enviar
   * `players_per_team = ceil(n/k)` e o backend distribuir de forma equilibrada (evita 6×5 em 4 times).
   * Se omitido, o hook busca uma vez GET /participants.
   */
  confirmedParticipantsCount?: number | null;
  /** Query `novo` na URL da config — força limpar estado e novo GET após descartar sorteio confirmado. */
  newDrawSignal?: string | null;
  /**
   * Na tela de resultado com `?resort=1`, permite Ressortear + config mesmo com sorteio já confirmado
   * (após o servidor aceitar DELETE do draw).
   */
  allowResortWhenConfirmed?: boolean;
  onTeamDrawValidationParticipants?: (participantIds: string[]) => void;
};

export function useTeamDraw({
  pregameId,
  canManage,
  pregamePlayersPerTeam,
  suggestedPlayersPerTeam,
  confirmedParticipantsCount: confirmedParticipantsCountProp,
  newDrawSignal,
  allowResortWhenConfirmed = false,
  onTeamDrawValidationParticipants,
}: UseTeamDrawOptions) {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [draw, setDraw] = useState<TeamDrawResponse | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [drawMode, setDrawMode] = useState<DrawMode>("num_teams");
  const [numTeams, setNumTeams] = useState(2);
  const [pptPlayers, setPptPlayers] = useState(5);
  const [balanceByOverall, setBalanceByOverall] = useState(true);

  const [numTeamsError, setNumTeamsError] = useState<string | null>(null);
  const [pptError, setPptError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(null);

  const fetchGeneration = useRef(0);
  const lastNovoRef = useRef<string | null>(null);

  const [internalConfirmedCount, setInternalConfirmedCount] = useState<number | null>(null);

  useEffect(() => {
    if (confirmedParticipantsCountProp !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pregames/${pregameId}/participants`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { confirmed?: unknown[] };
        const n = Array.isArray(data.confirmed) ? data.confirmed.length : 0;
        if (!cancelled) setInternalConfirmedCount(n);
      } catch {
        if (!cancelled) setInternalConfirmedCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pregameId, confirmedParticipantsCountProp]);

  const effectiveConfirmedCount =
    confirmedParticipantsCountProp !== undefined ? confirmedParticipantsCountProp : internalConfirmedCount;

  const hasTeams = useMemo(() => !!draw && draw.teams.length > 0, [draw]);

  const defaultPptFromPregame = useMemo(() => {
    const v = pregamePlayersPerTeam ?? suggestedPlayersPerTeam;
    if (typeof v === "number" && Number.isFinite(v) && v >= 2) return Math.floor(v);
    return 5;
  }, [pregamePlayersPerTeam, suggestedPlayersPerTeam]);

  const fetchCurrentDraw = useCallback(async () => {
    const myGen = ++fetchGeneration.current;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw`);
      if (myGen !== fetchGeneration.current) return;

      if (isSuccessResponse(res)) {
        const raw = await res.json();
        if (myGen !== fetchGeneration.current) return;
        const data = parseTeamDrawPayload(raw);
        if (!data) {
          setFetchError("Resposta do sorteio em formato inesperado.");
          return;
        }
        setDraw(data);
        setIsEmpty(false);
        setNumTeams(data.num_teams);
        setBalanceByOverall(data.balance_by_overall);
        if (data.players_per_team != null && data.players_per_team >= 2) {
          setDrawMode("ppt");
          setPptPlayers(data.players_per_team);
        } else {
          setDrawMode("num_teams");
        }
        setPptError(null);
        setNumTeamsError(null);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (myGen !== fetchGeneration.current) return;
      const mapped = mapTeamDrawError(res.status, data, "get_draw");
      if (mapped.kind === "no_draw_yet") {
        setDraw(null);
        setIsEmpty(true);
        setBalanceByOverall(true);
        setDrawMode(
          pregamePlayersPerTeam != null || suggestedPlayersPerTeam != null ? "ppt" : "num_teams"
        );
        setPptPlayers(defaultPptFromPregame);
        return;
      }
      setFetchError(mapped.message);
    } catch {
      if (myGen !== fetchGeneration.current) return;
      setFetchError("Erro de conexão ao buscar sorteio atual.");
    } finally {
      if (myGen === fetchGeneration.current) setLoading(false);
    }
  }, [
    pregameId,
    pregamePlayersPerTeam,
    suggestedPlayersPerTeam,
    defaultPptFromPregame,
  ]);

  useEffect(() => {
    lastNovoRef.current = null;
  }, [pregameId]);

  useEffect(() => {
    if (newDrawSignal && lastNovoRef.current !== newDrawSignal) {
      lastNovoRef.current = newDrawSignal;
      setDraw(null);
      setIsEmpty(true);
      setActionError(null);
      setFeedback(null);
      fetchGeneration.current += 1;
    }
    void fetchCurrentDraw();
  }, [fetchCurrentDraw, newDrawSignal]);

  function buildCreateBody(forceBelowMin: boolean): TeamDrawCreateRequest | null {
    const base: TeamDrawCreateRequest = {
      force_below_min: forceBelowMin,
      balance_by_overall: balanceByOverall,
      balance_goalkeepers: BALANCE_GOALKEEPERS_DEFAULT,
    };
    if (drawMode === "ppt") {
      if (!Number.isFinite(pptPlayers) || pptPlayers < 2) {
        setPptError("Informe pelo menos 2 jogadores por time.");
        return null;
      }
      setPptError(null);
      return { ...base, players_per_team: Math.floor(pptPlayers) };
    }
    if (!Number.isFinite(numTeams) || numTeams < 2) {
      setNumTeamsError("Escolha pelo menos 2 times.");
      return null;
    }
    setNumTeamsError(null);
    const k = Math.floor(numTeams);
    const n = effectiveConfirmedCount;
    if (typeof n === "number" && n >= 2 && k >= 2) {
      const ppt = Math.ceil(n / k);
      if (ppt >= 2) {
        return { ...base, players_per_team: ppt };
      }
    }
    return { ...base, num_teams: k };
  }

  async function createDraw(forceBelowMin: boolean) {
    if (submitting) return;
    setSubmitting(true);
    setNumTeamsError(null);
    setPptError(null);
    setActionError(null);
    setFeedback(null);

    const drawBeforeAttempt = draw;

    function revertNumTeamsIfHadSuccessfulDraw() {
      if (drawBeforeAttempt && drawBeforeAttempt.teams.length > 0) {
        setNumTeams(drawBeforeAttempt.num_teams);
        if (drawBeforeAttempt.players_per_team != null) {
          setPptPlayers(drawBeforeAttempt.players_per_team);
        }
      }
    }

    const body = buildCreateBody(forceBelowMin);
    if (!body) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (isSuccessResponse(res)) {
        const raw = await res.json();
        const data = parseTeamDrawPayload(raw);
        if (!data) {
          setActionError("Resposta do sorteio em formato inesperado.");
          revertNumTeamsIfHadSuccessfulDraw();
          return;
        }
        fetchGeneration.current += 1;
        setDraw(data);
        setIsEmpty(false);
        setNumTeams(data.num_teams);
        setBalanceByOverall(data.balance_by_overall);
        if (data.players_per_team != null && data.players_per_team >= 2) {
          setDrawMode("ppt");
          setPptPlayers(data.players_per_team);
        }
        setFeedback("Sorteio feito com sucesso.");
        onTeamDrawValidationParticipants?.([]);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const mapped = mapTeamDrawError(res.status, data, "create_draw");

      if (mapped.kind === "metrics_inconsistency") {
        onTeamDrawValidationParticipants?.(mapped.participantIds ?? []);
      } else {
        onTeamDrawValidationParticipants?.([]);
      }

      if (mapped.kind === "min_confirmed_not_reached" && !forceBelowMin) {
        const accepted = await confirm({
          title: "Mínimo de confirmados não atingido",
          description:
            "A quantidade mínima de confirmados não foi atingida. Deseja continuar mesmo assim?",
          confirmLabel: "Continuar sorteio",
          cancelLabel: "Cancelar",
          variant: "warning",
        });
        if (accepted) {
          await createDraw(true);
        } else {
          setFeedback("Sorteio cancelado.");
        }
        return;
      }

      revertNumTeamsIfHadSuccessfulDraw();

      if (mapped.field === "num_teams") {
        setNumTeamsError(mapped.message);
      } else if (mapped.field === "players_per_team") {
        setPptError(mapped.message);
      } else {
        setActionError(mapped.message);
      }
    } catch {
      revertNumTeamsIfHadSuccessfulDraw();
      setActionError("Erro de conexão ao sortear times.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTeams(): Promise<boolean> {
    if (confirming || !draw || draw.is_confirmed) return false;
    setConfirming(true);
    setActionError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (isSuccessResponse(res)) {
        const raw = (await res.json()) as Record<string, unknown>;
        setDraw((prev) => {
          if (!prev) return prev;
          const at =
            typeof raw.confirmed_at === "string"
              ? raw.confirmed_at
              : (prev.confirmed_at ?? null);
          return {
            ...prev,
            is_confirmed: true,
            confirmed_at: at,
          };
        });
        setFeedback("Times confirmados.");
        return true;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const mapped = mapTeamDrawError(res.status, data, "confirm_draw");
      setActionError(mapped.message);
      return false;
    } catch {
      setActionError("Erro de conexão ao confirmar times.");
      return false;
    } finally {
      setConfirming(false);
    }
  }

  async function moveParticipant(participantId: string, fromTeamId: string, targetTeamId: string) {
    if (!targetTeamId || targetTeamId === fromTeamId || movingParticipantId) return;
    setMovingParticipantId(participantId);
    setActionError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id: participantId, target_team_id: targetTeamId }),
      });
      if (isSuccessResponse(res)) {
        const raw = await res.json();
        const data = parseTeamDrawPayload(raw);
        if (data) {
          setDraw(data);
          setFeedback("Jogador movido.");
        } else {
          await fetchCurrentDraw();
        }
        return;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const mapped = mapTeamDrawError(res.status, data, "patch_assignments");
      setActionError(mapped.message);
    } catch {
      setActionError("Erro de conexão ao mover jogador.");
    } finally {
      setMovingParticipantId(null);
    }
  }

  async function swapParticipants(
    participantIdA: string,
    fromTeamIdA: string,
    participantIdB: string,
    fromTeamIdB: string,
  ) {
    if (movingParticipantId || !draw) return;
    setMovingParticipantId(participantIdA);
    setActionError(null);
    setFeedback(null);

    // Optimistic update: swap players between teams in local state
    const prevDraw = draw;
    setDraw((prev) => {
      if (!prev) return prev;
      const playerA = prev.teams
        .find((t) => t.id === fromTeamIdA)
        ?.players.find((p) => p.participant_id === participantIdA);
      const playerB = prev.teams
        .find((t) => t.id === fromTeamIdB)
        ?.players.find((p) => p.participant_id === participantIdB);
      if (!playerA || !playerB) return prev;
      return {
        ...prev,
        teams: prev.teams.map((team) => {
          if (team.id === fromTeamIdA) {
            return {
              ...team,
              players: [...team.players.filter((p) => p.participant_id !== participantIdA), playerB],
            };
          }
          if (team.id === fromTeamIdB) {
            return {
              ...team,
              players: [...team.players.filter((p) => p.participant_id !== participantIdB), playerA],
            };
          }
          return team;
        }),
      };
    });

    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id_a: participantIdA, participant_id_b: participantIdB }),
      });
      if (isSuccessResponse(res)) {
        const raw = await res.json();
        const data = parseTeamDrawPayload(raw);
        if (data) {
          setDraw(data);
          setFeedback("Jogadores trocados.");
        } else {
          await fetchCurrentDraw();
        }
        return;
      }
      // Revert optimistic update on error
      setDraw(prevDraw);
      const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const msg =
        (errData.message as string | undefined) ?? "Erro ao trocar jogadores entre times.";
      setActionError(msg);
    } catch {
      setDraw(prevDraw);
      setActionError("Erro de conexão ao trocar jogadores.");
    } finally {
      setMovingParticipantId(null);
    }
  }

  async function handleCopyWhatsapp() {
    if (copying) return;
    setCopying(true);
    setActionError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw/whatsapp-text`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const mapped = mapTeamDrawError(res.status, data, "whatsapp_text");
        setActionError(mapped.message);
        return;
      }

      const data = (await res.json()) as { text: string };
      try {
        await navigator.clipboard.writeText(data.text);
        setFeedback("Texto copiado para o WhatsApp.");
      } catch {
        setFallbackText(data.text);
      }
    } catch {
      setActionError("Erro de conexão ao gerar texto para WhatsApp.");
    } finally {
      setCopying(false);
    }
  }

  const drawControlsDisabled =
    submitting || ((draw?.is_confirmed ?? false) && !allowResortWhenConfirmed);

  return {
    loading,
    draw,
    isEmpty,
    fetchError,
    drawMode,
    setDrawMode,
    numTeams,
    setNumTeams,
    pptPlayers,
    setPptPlayers,
    balanceByOverall,
    setBalanceByOverall,
    numTeamsError,
    pptError,
    actionError,
    submitting,
    confirming,
    copying,
    feedback,
    fallbackText,
    setFallbackText,
    movingParticipantId,
    hasTeams,
    fetchCurrentDraw,
    createDraw,
    confirmTeams,
    moveParticipant,
    swapParticipants,
    handleCopyWhatsapp,
    drawControlsDisabled,
    pregamePlayersPerTeam,
    suggestedPlayersPerTeam,
    canManage,
  };
}
