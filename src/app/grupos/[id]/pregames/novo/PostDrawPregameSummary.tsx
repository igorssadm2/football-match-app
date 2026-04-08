"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mapTeamDrawError } from "@/lib/mapTeamDrawError";
import { parseTeamDrawPayload } from "@/components/pregame/team-draw/teamDrawHelpers";
import type { TeamDrawResponse } from "@/types/pregame";

type Props = {
  groupId: string;
  pregameId: string;
  drawDone: boolean;
};

export function PostDrawPregameSummary({ groupId, pregameId, drawDone }: Props) {
  const router = useRouter();
  const [pregameName, setPregameName] = useState<string | null>(null);
  const [draw, setDraw] = useState<TeamDrawResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pgRes, drRes] = await Promise.all([
          fetch(`/api/pregames/${pregameId}`),
          fetch(`/api/pregames/${pregameId}/team-draw`),
        ]);
        if (!pgRes.ok) {
          if (!cancelled) setError("Não foi possível carregar a partida.");
          return;
        }
        const pg = (await pgRes.json()) as { name?: string };
        if (cancelled) return;
        setPregameName(pg.name ?? "Partida");

        if (drRes.ok) {
          const raw = await drRes.json();
          const d = parseTeamDrawPayload(raw);
          if (d && !cancelled) setDraw(d);
        }
      } catch {
        if (!cancelled) setError("Erro ao carregar dados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pregameId]);

  useEffect(() => {
    if (!drawDone) return;
    const t = window.setTimeout(() => setShowModal(true), 1000);
    return () => window.clearTimeout(t);
  }, [drawDone]);

  function clearDrawDoneQuery() {
    router.replace(`/grupos/${groupId}/pregames/novo?pregameId=${encodeURIComponent(pregameId)}`);
  }

  async function handleCopyWhatsapp() {
    setCopying(true);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/team-draw/whatsapp-text`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const mapped = mapTeamDrawError(res.status, data, "whatsapp_text");
        setError(mapped.message);
        return;
      }
      const data = (await res.json()) as { text: string };
      await navigator.clipboard.writeText(data.text);
    } catch {
      setError("Não foi possível copiar.");
    } finally {
      setCopying(false);
      setShowModal(false);
      clearDrawDoneQuery();
    }
  }

  function closeModal() {
    setShowModal(false);
    if (drawDone) clearDrawDoneQuery();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400 text-sm py-12 justify-center">
        <span className="w-5 h-5 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
        Carregando…
      </div>
    );
  }

  if (error && !pregameName) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-zinc-100">Partida pronta</h2>
        <p className="text-sm text-zinc-400 mt-1">
          <strong className="text-zinc-200">{pregameName}</strong>
        </p>
      </div>

      {error && <p className="text-xs text-amber-400 text-center">{error}</p>}

      {draw && draw.teams.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Times</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {draw.teams.map((team) => {
              const n = team.players.length;
              const avgOverall =
                n > 0 ? team.players.reduce((sum, p) => sum + p.overall, 0) / n : null;

              return (
                <article
                  key={team.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <h4 className="text-sm font-bold text-zinc-100 mb-2">{team.name}</h4>
                  <ul className="space-y-1">
                    {team.players.map((p, idx) => (
                      <li key={p.participant_id} className="text-sm text-zinc-300">
                        {idx + 1}. {p.name}{" "}
                        <span className="text-xs text-zinc-500">({p.overall})</span>
                      </li>
                    ))}
                  </ul>
                  {avgOverall != null && (
                    <p className="mt-3 border-t border-zinc-800/80 pt-2 text-xs text-zinc-400">
                      Média do overall do time:{" "}
                      <span className="font-semibold tabular-nums text-zinc-300">
                        {avgOverall.toFixed(1)}
                      </span>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 text-center">
          Sorteio ainda não disponível ou sem times. Abra a partida para conferir.
        </p>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Link
          href={`/pregames/${pregameId}`}
          className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3.5 px-6 text-center text-sm transition-colors"
        >
          Ver partida
        </Link>
        <Link
          href={`/grupos/${groupId}`}
          className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 px-6 text-center text-sm transition-colors"
        >
          Voltar ao grupo
        </Link>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fechar"
            onClick={closeModal}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-2 mb-4">
              <p className="text-sm font-semibold text-zinc-100">Copiar times para o WhatsApp</p>
              <button
                type="button"
                onClick={closeModal}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyWhatsapp()}
              disabled={copying}
              className="w-full min-h-[48px] rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-zinc-950 font-bold text-sm"
            >
              {copying ? "Copiando…" : "Copiar para WhatsApp"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
