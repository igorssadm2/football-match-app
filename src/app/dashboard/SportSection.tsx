"use client";

import { useEffect, useState } from "react";
import { useError, parseBackendError } from "@/contexts/ErrorContext";

interface FootballProfile {
  dominant_foot: string;
  preferred_position?: string;
  shoe_size: number;
  skill_level: string;
}

interface SportData {
  football?: FootballProfile;
}

const POSITIONS = [
  { value: "all_positions",        label: "Todas as posições" },
  { value: "goalkeeper",           label: "Goleiro" },
  { value: "defender",             label: "Zagueiro" },
  { value: "right_back",           label: "Lateral Direito" },
  { value: "left_back",            label: "Lateral Esquerdo" },
  { value: "defensive_midfielder", label: "Volante" },
  { value: "central_midfielder",   label: "Meia Central" },
  { value: "attacking_midfielder", label: "Meia Atacante" },
  { value: "winger",               label: "Ponta / Ala" },
  { value: "striker",              label: "Centroavante" },
  { value: "forward",              label: "Atacante" },
];

const FEET = [
  { value: "right", label: "Direito" },
  { value: "left",  label: "Esquerdo" },
  { value: "both",  label: "Ambos" },
];

const SKILL_LEVELS = [
  { value: "beginner",     label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced",     label: "Avançado" },
  { value: "professional", label: "Profissional" },
];

const SHOE_SIZES = Array.from({ length: 16 }, (_, i) => 33 + i);

function labelOf(list: { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}

const SKILL_STYLE: Record<string, { pill: string; dot: string }> = {
  beginner:     { pill: "bg-zinc-700/60 text-zinc-300",   dot: "bg-zinc-400" },
  intermediate: { pill: "bg-blue-500/15 text-blue-300",   dot: "bg-blue-400" },
  advanced:     { pill: "bg-amber-500/15 text-amber-300", dot: "bg-amber-400" },
  professional: { pill: "bg-green-500/15 text-green-300", dot: "bg-green-400" },
};

const inputCls =
  "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 w-full";

export default function SportSection() {
  const { pushError } = useError();
  const [sport, setSport] = useState<SportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    preferred_position: "all_positions",
    dominant_foot: "",
    skill_level: "",
    shoe_size: "",
  });

  useEffect(() => {
    fetch("/api/users/sports")
      .then(async (res) => {
        if (!res.ok) {
          pushError(await parseBackendError(res, { title: "Erro ao carregar esporte", type: "server_error" }));
          return;
        }
        const data: SportData = await res.json();
        setSport(data);
        if (data.football) {
          setForm({
            preferred_position: data.football.preferred_position ?? "all_positions",
            dominant_foot:      data.football.dominant_foot,
            skill_level:        data.football.skill_level,
            shoe_size:          String(data.football.shoe_size),
          });
        }
      })
      .catch(() => {
        pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível carregar seus dados de esporte." });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: {
            football: {
              preferred_position: form.preferred_position,
              dominant_foot: form.dominant_foot,
              skill_level:   form.skill_level,
              shoe_size:     Number(form.shoe_size),
            },
          },
        }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao salvar esporte", type: "server_error" }));
        return;
      }
      const data: SportData = await res.json();
      setSport(data);
      setEditing(false);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (sport?.football) {
      setForm({
        preferred_position: sport.football.preferred_position ?? "all_positions",
        dominant_foot:      sport.football.dominant_foot,
        skill_level:        sport.football.skill_level,
        shoe_size:          String(sport.football.shoe_size),
      });
    }
    setEditing(true);
  }

  const football = sport?.football;
  const skillStyle = SKILL_STYLE[football?.skill_level ?? ""] ?? SKILL_STYLE.beginner;

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-green-400 text-xs font-semibold mb-0.5">Perfil</p>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-100">Meu Esporte</h3>
              <span className="text-base leading-none">⚽</span>
              {football && !editing && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${skillStyle.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${skillStyle.dot}`} />
                  {labelOf(SKILL_LEVELS, football.skill_level)}
                </span>
              )}
            </div>
          </div>
        </div>
        {!loading && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all duration-150"
          >
            {football ? "Editar →" : "Registrar →"}
          </button>
        )}
      </div>

      <div className="border-t border-zinc-800/60">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-zinc-600 text-sm">
            <span className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        )}

        {/* Perfil registrado */}
        {!loading && !editing && football && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800/40">
            {[
              { label: "Posição", value: football.preferred_position ? labelOf(POSITIONS, football.preferred_position) : "—" },
              { label: "Pé dominante", value: labelOf(FEET, football.dominant_foot) },
              { label: "Nível",    value: labelOf(SKILL_LEVELS, football.skill_level) },
              { label: "Calçado", value: `Nº ${football.shoe_size}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 bg-zinc-900/40 px-5 py-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</span>
                <span className="text-sm font-bold text-zinc-100">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !editing && !football && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6">
            <div>
              <p className="font-bold text-zinc-200 mb-0.5">Nenhum esporte registrado</p>
              <p className="text-zinc-500 text-sm">
                Adicione seu perfil de futebol para entrar nas partidas.
              </p>
            </div>
            <button
              type="button"
              onClick={startEdit}
              className="shrink-0 rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 text-zinc-950 font-semibold text-sm px-5 py-2.5 transition-all duration-150"
            >
              Registrar esporte
            </button>
          </div>
        )}

        {/* Formulário */}
        {!loading && editing && (
          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Posição</label>
                <select
                  value={form.preferred_position}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_position: e.target.value }))}
                  className={inputCls}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pé dominante</label>
                <select
                  required
                  value={form.dominant_foot}
                  onChange={(e) => setForm((p) => ({ ...p, dominant_foot: e.target.value }))}
                  className={inputCls}
                >
                  <option value="" disabled>Selecione</option>
                  {FEET.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nível</label>
                <select
                  required
                  value={form.skill_level}
                  onChange={(e) => setForm((p) => ({ ...p, skill_level: e.target.value }))}
                  className={inputCls}
                >
                  <option value="" disabled>Selecione</option>
                  {SKILL_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Calçado</label>
                <select
                  required
                  value={form.shoe_size}
                  onChange={(e) => setForm((p) => ({ ...p, shoe_size: e.target.value }))}
                  className={inputCls}
                >
                  <option value="" disabled>Nº</option>
                  {SHOE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-6 text-sm transition-all duration-150 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : "Salvar"}
              </button>
              {football && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-sm text-zinc-300 font-medium transition-all duration-150"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
