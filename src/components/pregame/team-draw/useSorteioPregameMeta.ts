"use client";

import { useEffect, useState } from "react";
import { canManagePregame, type GroupAclPayload } from "@/lib/pregameCanManage";
import type { PreGameParticipantsResponse } from "@/types/pregame";

export function useSorteioPregameMeta(pregameId: string) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    canManage: boolean;
    name: string | null;
    playersPerTeam: number | null;
    suggestedPpt: number | null;
    groupId: string | null;
    /** Quantidade de confirmados no pré-jogo (para POST de sorteio equilibrado). */
    confirmedParticipantsCount: number | null;
  }>({
    loading: true,
    error: null,
    canManage: false,
    name: null,
    playersPerTeam: null,
    suggestedPpt: null,
    groupId: null,
    confirmedParticipantsCount: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pgRes, userRes, partRes] = await Promise.all([
          fetch(`/api/pregames/${pregameId}`),
          fetch("/api/users"),
          fetch(`/api/pregames/${pregameId}/participants`),
        ]);
        if (!pgRes.ok) {
          if (!cancelled) {
            setState((s) => ({
              ...s,
              loading: false,
              error: "Não foi possível carregar a partida.",
            }));
          }
          return;
        }
        const pg = (await pgRes.json()) as {
          name?: string;
          group_id: string;
          created_by?: string;
          players_per_team?: number | null;
          suggested_players_per_team?: number | null;
        };
        const user = userRes.ok ? await userRes.json() : null;
        const uid = user?.id as string | undefined;
        const gRes = await fetch(`/api/groups/${pg.group_id}`);
        const group = gRes.ok ? ((await gRes.json()) as GroupAclPayload) : null;
        let confirmedParticipantsCount: number | null = null;
        if (partRes.ok) {
          const part = (await partRes.json()) as PreGameParticipantsResponse;
          confirmedParticipantsCount = Array.isArray(part.confirmed) ? part.confirmed.length : 0;
        }
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          canManage: canManagePregame(uid, pg.created_by, group),
          name: pg.name ?? "Partida",
          playersPerTeam: pg.players_per_team ?? null,
          suggestedPpt: pg.suggested_players_per_team ?? null,
          groupId: pg.group_id,
          confirmedParticipantsCount,
        });
      } catch {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: "Erro ao carregar dados da partida.",
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pregameId]);

  return state;
}
