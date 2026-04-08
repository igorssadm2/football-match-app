"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useError } from "@/contexts/ErrorContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PreGameItem {
  id: string;
  group_id: string;
  name: string;
  type: string;
  status: string;
  match_date: string;
  starts_at: string;
  location_name: string;
  min_players: number;
  max_players: number;
  visibility: string;
  created_at: string;
  players_per_team?: number | null;
  suggested_players_per_team?: number | null;
}

export function PreGamesSection({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const { pushError } = useError();
  const [preGames, setPreGames] = useState<PreGameItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPreGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/pregames`);
      if (!res.ok) {
        return;
      }
      const data = await res.json() as { items?: PreGameItem[] };
      setPreGames(data.items || []);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível carregar as partidas." });
    } finally {
      setLoading(false);
    }
  }, [groupId, pushError]);

  useEffect(() => {
    fetchPreGames();
  }, [fetchPreGames]);

  function formatMatchDate(iso: string, startsAt: string) {
    try {
      const date = new Date(iso);
      const time = new Date(startsAt);
      return `${format(date, "EE, dd MMM", { locale: ptBR })} às ${format(time, "HH:mm")}`;
    } catch {
      return iso;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "open": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "cancelled": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "completed": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return "text-zinc-400 bg-zinc-800 border-zinc-700";
    }
  }

  return (
    <div className="relative rounded-2xl border border-orange-500/20 bg-zinc-900/40 overflow-hidden mt-4">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-300">Partidas (Pre-Games)</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Gerencie e acompanhe as próximas partidas</p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href={`/grupos/${groupId}/pregames/novo`}
            className="text-xs font-semibold text-zinc-950 bg-green-500 hover:bg-green-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            + Nova Partida
          </Link>
        )}
      </div>

      <div className="px-5 pb-5 border-t border-zinc-800/60">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : preGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 16 16" stroke="currentColor">
                <circle cx="8" cy="8" r="7" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Nenhuma partida programada.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-4">
            {preGames.map(pg => (
              <Link key={pg.id} href={`/pregames/${pg.id}`} className="block">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-orange-500/30 hover:bg-zinc-800/60 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">{pg.name}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(pg.status)}`}>
                          {pg.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatMatchDate(pg.match_date, pg.starts_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {pg.location_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Mín {pg.min_players} • Máx {pg.max_players}
                          {pg.players_per_team != null && (
                            <span className="text-zinc-500"> · {pg.players_per_team}/time</span>
                          )}
                          {pg.players_per_team == null && pg.suggested_players_per_team != null && (
                            <span className="text-zinc-600"> · ~{pg.suggested_players_per_team}/time</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      <svg className="w-4 h-4 text-zinc-700 group-hover:text-orange-500 transition-colors group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
