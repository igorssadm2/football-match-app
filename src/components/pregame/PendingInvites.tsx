"use client";

import { useEffect, useState } from "react";
import { useError, parseBackendError } from "@/contexts/ErrorContext";

interface PendingInvite {
  pregame_id: string;
  group_id: string;
  name: string;
  match_date: string;
  starts_at: string;
  location_name: string;
  status: string;
  max_players: number;
}

export function PendingInvites() {
  const { pushError } = useError();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    try {
      const res = await fetch("/api/users/me/pregame-invites");
      if (!res.ok) return;
      const data = await res.json() as { items?: PendingInvite[] };
      setInvites(data.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(pregameId: string, action: "accept" | "decline") {
    setProcessingId(pregameId);
    try {
      const endpoint = action === "accept" ? "accept-invite" : "decline-invite";
      const res = await fetch(`/api/pregames/${pregameId}/${endpoint}`, {
        method: "POST"
      });
      
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao responder convite", type: "server_error" }));
        return;
      }
      
      // Remove the invite from the list on success
      setInvites(prev => prev.filter(inv => inv.pregame_id !== pregameId));
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setProcessingId(null);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit", 
        month: "short"
      });
    } catch {
      return iso;
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  if (loading || invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest pl-1">Convites Pendentes</h3>
      
      {invites.map(invite => {
        const isProcessing = processingId === invite.pregame_id;
        
        return (
          <div key={invite.pregame_id} className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-zinc-900/80 p-4 shadow-lg shadow-black/20">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3 items-start sm:items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-1 sm:mt-0">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-100">{invite.name}</h4>
                  <p className="text-sm text-amber-400/90 font-medium">
                    {formatDate(invite.match_date)} às {formatTime(invite.starts_at)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 max-w-[280px] truncate" title={invite.location_name}>
                    📍 {invite.location_name}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(invite.pregame_id, "decline")}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-zinc-300 font-medium text-sm px-4 py-2 transition-colors flex items-center gap-1.5"
                >
                  Tá fora
                </button>
                <button
                  onClick={() => handleAction(invite.pregame_id, "accept")}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none justify-center rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-amber-950 font-bold text-sm px-6 py-2 transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  {isProcessing && processingId === invite.pregame_id ? (
                    <span className="w-4 h-4 border-2 border-amber-950/30 border-t-amber-950 rounded-full animate-spin" />
                  ) : "Tá dentro"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
