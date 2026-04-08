"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useError, parseBackendError } from "@/contexts/ErrorContext";
import type { PreGame } from "@/types/pregame";

const inputCls =
  "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 w-full";

export default function EditPregamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pregameId } = use(params);
  const router = useRouter();
  const { pushError } = useError();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "standard",
    match_date: "",
    starts_at: "",
    ends_at: "",
    location_name: "",
    location_details: "",
    min_players: 10,
    max_players: 14,
    allow_waiting_list: true,
    visibility: "private",
    entry_mode: "automatic",
    join_deadline: "",
    cancellation_deadline: "",
    notes: "",
    members_priority_deadline: "",
    team_format: "7x7",
    members_price: "",
    guest_price: "",
    flat_price: "",
    players_per_team: "",
  });

  const fetchPregameData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pregames/${pregameId}`);
      if (!res.ok) {
        pushError({ title: "Erro", type: "server_error", message: "Erro ao carregar partida." });
        return;
      }
      const data = await res.json() as PreGame;
      
      const matchDateStr = data.match_date ? data.match_date.substring(0, 10) : "";
      const startsAtStr = data.starts_at ? new Date(data.starts_at).toTimeString().substring(0, 5) : "";
      const endsAtStr = data.ends_at ? new Date(data.ends_at).toTimeString().substring(0, 5) : "";
      const joinStr = data.join_deadline ? new Date(data.join_deadline).toTimeString().substring(0, 5) : "";
      const cancelStr = data.cancellation_deadline ? new Date(data.cancellation_deadline).toTimeString().substring(0, 5) : "";

      const priorityDeadlineStr = data.members_priority_deadline
        ? new Date(data.members_priority_deadline).toISOString().substring(0, 16)
        : "";

      setFormData({
        name: data.name || "",
        type: data.type || "standard",
        match_date: matchDateStr,
        starts_at: startsAtStr,
        ends_at: endsAtStr,
        location_name: data.location_name || "",
        location_details: data.location_details || "",
        min_players: data.min_players || 10,
        max_players: data.max_players || 14,
        allow_waiting_list: data.allow_waiting_list ?? true,
        visibility: data.visibility || "private",
        entry_mode: data.entry_mode || "automatic",
        join_deadline: joinStr,
        cancellation_deadline: cancelStr,
        notes: data.notes || "",
        members_priority_deadline: priorityDeadlineStr,
        team_format: data.team_format || "7x7",
        members_price: data.members_price != null ? String(data.members_price) : "",
        guest_price: data.guest_price != null ? String(data.guest_price) : "",
        flat_price: data.flat_price != null ? String(data.flat_price) : "",
        players_per_team:
          data.players_per_team != null ? String(data.players_per_team) : "",
      });
    } catch {
      pushError({ title: "Erro", type: "network_error", message: "Falha de conexão." });
    } finally {
      setLoading(false);
    }
  }, [pregameId, pushError]);

  useEffect(() => {
    fetchPregameData();
  }, [fetchPregameData]);

  function update(field: string, value: string | number | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.match_date || !formData.starts_at || !formData.location_name) {
      pushError({ title: "Validação", type: "validation_error", message: "Preencha os campos obrigatórios." });
      return;
    }
    
    setSaving(true);
    try {
      const maxP = Number(formData.max_players);
      if (formData.players_per_team !== "") {
        const ppt = Number(formData.players_per_team);
        if (!Number.isFinite(ppt) || ppt < 2 || ppt > maxP) {
          pushError({
            title: "Jogadores por time",
            type: "validation_error",
            message: `Informe um valor entre 2 e ${maxP}, ou deixe em branco.`,
          });
          setSaving(false);
          return;
        }
      }

      const startsAtISO = new Date(`${formData.match_date}T${formData.starts_at}:00`).toISOString();
      let matchDateISO;
      try { matchDateISO = new Date(formData.match_date).toISOString(); } catch { matchDateISO = startsAtISO; }
      
      const endsAtISO = formData.ends_at ? new Date(`${formData.match_date}T${formData.ends_at}:00`).toISOString() : null;
      
      let joinDeadlineISO = null, cancellationDeadlineISO = null;
      if (formData.join_deadline) {
        joinDeadlineISO = new Date(`${formData.match_date}T${formData.join_deadline}:00`).toISOString();
      }
      if (formData.cancellation_deadline) {
        cancellationDeadlineISO = new Date(`${formData.match_date}T${formData.cancellation_deadline}:00`).toISOString();
      }

      const payload = {
        name: formData.name,
        type: formData.type,
        match_date: matchDateISO,
        starts_at: startsAtISO,
        ends_at: endsAtISO,
        location_name: formData.location_name,
        location_details: formData.location_details || null,
        min_players: Number(formData.min_players),
        max_players: Number(formData.max_players),
        allow_waiting_list: formData.allow_waiting_list,
        visibility: formData.visibility,
        entry_mode: formData.entry_mode,
        join_deadline: joinDeadlineISO,
        cancellation_deadline: cancellationDeadlineISO,
        notes: formData.notes || null,
        members_priority_deadline: formData.members_priority_deadline
          ? new Date(formData.members_priority_deadline).toISOString()
          : null,
        team_format: formData.team_format || null,
        members_price: formData.members_price !== "" ? Number(formData.members_price) : null,
        guest_price: formData.guest_price !== "" ? Number(formData.guest_price) : null,
        flat_price: formData.flat_price !== "" ? Number(formData.flat_price) : null,
        ...(formData.players_per_team !== ""
          ? { players_per_team: Number(formData.players_per_team) }
          : { players_per_team: null }),
      };

      const res = await fetch(`/api/pregames/${pregameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao atualizar partida", type: "server_error" }));
        return;
      }

      router.push(`/pregames/${pregameId}`);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href={`/pregames/${pregameId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-black text-lg tracking-tight">Editar <span className="text-green-400">Partida</span></span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Informações Básicas</h2>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">Nome da partida</label>
              <input type="text" required placeholder="Ex: Racha de Quinta" value={formData.name} onChange={e => update("name", e.target.value)} className={inputCls} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Data</label>
                <input type="date" required value={formData.match_date} onChange={e => update("match_date", e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Início</label>
                  <input type="time" required value={formData.starts_at} onChange={e => update("starts_at", e.target.value)} className={inputCls} />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Fim <span className="text-zinc-600">(opc)</span></label>
                  <input type="time" value={formData.ends_at} onChange={e => update("ends_at", e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">Local (Nome da Arena/Quadra)</label>
              <input type="text" required placeholder="Ex: Arena Copacabana" value={formData.location_name} onChange={e => update("location_name", e.target.value)} className={inputCls} />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">Detalhes do Local <span className="text-zinc-600">(opcional)</span></label>
              <input type="text" placeholder="Quadra 3, portão lateral..." value={formData.location_details} onChange={e => update("location_details", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Configurações de Jogadores</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Formato</label>
                <select value={formData.team_format} onChange={e => update("team_format", e.target.value)} className={inputCls + " appearance-none"}>
                  <option value="5x5">5 vs 5</option>
                  <option value="6x6">6 vs 6</option>
                  <option value="7x7">7 vs 7</option>
                  <option value="8x8">8 vs 8</option>
                  <option value="9x9">9 vs 9</option>
                  <option value="11x11">11 vs 11</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Mínimo</label>
                <input type="number" min={2} required value={formData.min_players} onChange={e => update("min_players", e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Limite Máximo</label>
                <input type="number" min={formData.min_players} required value={formData.max_players} onChange={e => update("max_players", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">
                Jogadores por time <span className="text-zinc-600">(opcional)</span>
              </label>
              <input
                type="number"
                min={2}
                max={Number(formData.max_players) || 99}
                placeholder="Ex.: 7"
                value={formData.players_per_team}
                onChange={(e) => update("players_per_team", e.target.value)}
                className={inputCls}
              />
              <p className="text-[11px] text-zinc-500">Entre 2 e o limite máximo; usado para pré-preencher o sorteio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-zinc-800/60 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.allow_waiting_list} onChange={e => update("allow_waiting_list", e.target.checked)} className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-green-500 focus:ring-green-500 focus:ring-offset-zinc-950" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-200">Lista de Espera</span>
                  <span className="text-xs text-zinc-500">Permitir entrar na fila se lotar</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.visibility === "public_to_fill_spots"} onChange={e => update("visibility", e.target.checked ? "public_to_fill_spots" : "private")} className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-green-500 focus:ring-green-500 focus:ring-offset-zinc-950" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-200">Público p/ preencher vagas</span>
                  <span className="text-xs text-zinc-500">Qualquer um pode ver se sobrar vaga</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.entry_mode === "approval_required"} onChange={e => update("entry_mode", e.target.checked ? "approval_required" : "automatic")} className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-green-500 focus:ring-green-500 focus:ring-offset-zinc-950" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-200">Requer Aprovação</span>
                  <span className="text-xs text-zinc-500">Admin deve aprovar os confirmados</span>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Custos da Partida</h2>
            
            {formData.type === "standard" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Valor para Mensalistas</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                    <input type="number" step="0.01" min={0} placeholder="0,00" value={formData.members_price} onChange={e => update("members_price", e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                  <span className="text-[11px] text-zinc-500">Deixe zerado se coberto pela mensalidade</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Valor para Avulsos (Convidados)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                    <input type="number" step="0.01" min={0} placeholder="0,00" value={formData.guest_price} onChange={e => update("guest_price", e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                  <span className="text-[11px] text-zinc-500">Preço pago por jogo</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Valor Único (Para todos)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                  <input type="number" step="0.01" min={0} placeholder="0,00" value={formData.flat_price} onChange={e => update("flat_price", e.target.value)} className={inputCls + " pl-9"} />
                </div>
                <span className="text-[11px] text-zinc-500">Partidas Extras cobram o mesmo valor de todos (mensalistas e avulsos)</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden text-sm">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/40 transition-colors">
              <span className="font-bold tracking-widest text-zinc-500 uppercase">Avançado (Opcional)</span>
              <svg className={`w-5 h-5 text-zinc-500 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAdvanced && (
              <div className="p-6 pt-0 border-t border-zinc-800/60 mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Data/Hora limite para entrar</label>
                    <input type="time" title="Horário limite no dia da partida" value={formData.join_deadline} onChange={e => update("join_deadline", e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Data/Hora limite para sair</label>
                    <input type="time" title="Horário limite no dia da partida para cancelar sem punição" value={formData.cancellation_deadline} onChange={e => update("cancellation_deadline", e.target.value)} className={inputCls} />
                  </div>
                </div>

                {formData.type === "standard" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Prazo de prioridade para mensalistas</label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={formData.members_priority_deadline}
                        onChange={e => update("members_priority_deadline", e.target.value)}
                        className={inputCls + " flex-1"}
                      />
                      {formData.members_priority_deadline && (
                        <button
                          type="button"
                          onClick={() => update("members_priority_deadline", "")}
                          className="px-3 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Mensalistas têm prioridade de inscrição até este horário. Dia-use só poderão entrar após o prazo.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Observações adicionais</label>
                  <textarea rows={2} placeholder="Ex: Trazer colete branco e preto" value={formData.notes} onChange={e => update("notes", e.target.value)} className={inputCls + " resize-none"} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Link href={`/pregames/${pregameId}`} className="px-6 py-3.5 rounded-xl font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 px-6 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
              {saving ? <span className="w-5 h-5 border-2 border-green-950/30 border-t-green-950 rounded-full animate-spin" /> : "Salvar Alterações"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
