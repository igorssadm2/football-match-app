"use client";

import { useState } from "react";
import Link from "next/link";
import { useError, parseBackendError } from "@/contexts/ErrorContext";
import { PostDrawPregameSummary } from "./PostDrawPregameSummary";

// ─── Types ──────────────────────────────────────────────────────────────────

type PregameType = "standard" | "extra";
type TeamFormat = "5x5" | "6x6" | "7x7" | "8x8" | "9x9" | "11x11";

// ─── Constants ───────────────────────────────────────────────────────────────

const PREGAME_TYPES: { value: PregameType; label: string; emoji: string; desc: string }[] = [
  { value: "standard", label: "Standard", emoji: "🏆", desc: "Partida regular do grupo" },
  { value: "extra",    label: "Extra",    emoji: "⚡",  desc: "Partida avulsa, preço único" },
];

const TEAM_FORMATS: { value: TeamFormat; label: string }[] = [
  { value: "5x5",   label: "5v5" },
  { value: "6x6",   label: "6v6" },
  { value: "7x7",   label: "7v7" },
  { value: "8x8",   label: "8v8" },
  { value: "9x9",   label: "9v9" },
  { value: "11x11", label: "11v11" },
];

const inputCls =
  "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 w-full";

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < step
              ? "w-6 h-1.5 bg-green-500"
              : i === step
              ? "w-6 h-1.5 bg-green-400"
              : "w-1.5 h-1.5 bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
      <button
        type="button"
        onClick={onChange}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-zinc-200">{label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-zinc-700"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
      </button>
    </div>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────────

function SuccessScreen({ pregameId, pregameName, groupId }: { pregameId: string; pregameName: string; groupId: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-6">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-zinc-100">Partida criada!</h2>
        <p className="text-sm text-zinc-400 mt-1">
          <strong className="text-zinc-200">{pregameName}</strong> está pronta para rolar.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <Link
          href={`/pregames/${pregameId}`}
          className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3.5 px-6 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver partida
        </Link>
        <Link
          href={`/grupos/${groupId}`}
          className="w-full rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 font-medium py-3 px-6 transition-colors text-sm text-center border border-zinc-700/50"
        >
          Voltar ao grupo
        </Link>
      </div>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export default function CreatePregameForm({
  groupId,
  initialPregameId,
  drawDone,
}: {
  groupId: string;
  initialPregameId?: string | null;
  drawDone?: boolean;
}) {
  const { pushError } = useError();

  if (initialPregameId) {
    return (
      <PostDrawPregameSummary
        groupId={groupId}
        pregameId={initialPregameId}
        drawDone={!!drawDone}
      />
    );
  }

  // Step 0 = Tipo/Identificação, 1 = Local/Jogadores, 2 = Regras/Custos, 3 = Sucesso
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Post-creation state
  const [createdPregameId, setCreatedPregameId] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    type: "standard" as PregameType,
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
    team_format: "7x7" as TeamFormat,
    members_price: "",
    guest_price: "",
    flat_price: "",
    /** Vazio = omitir no POST */
    players_per_team: "",
  });

  function update(field: string, value: string | number | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function canAdvanceStep0() {
    return formData.name.trim().length >= 2 && formData.match_date !== "" && formData.starts_at !== "";
  }

  function canAdvanceStep1() {
    return (
      formData.location_name.trim().length >= 1 &&
      Number(formData.min_players) >= 2 &&
      Number(formData.max_players) >= Number(formData.min_players)
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const maxP = Number(formData.max_players);
      if (formData.players_per_team !== "") {
        const ppt = Number(formData.players_per_team);
        if (!Number.isFinite(ppt) || ppt < 2 || ppt > maxP) {
          pushError({
            title: "Jogadores por time",
            type: "validation_error",
            message: `Informe um valor entre 2 e ${maxP} (limite máximo da partida), ou deixe em branco.`,
          });
          setSubmitting(false);
          return;
        }
      }

      const startsAtISO = new Date(`${formData.match_date}T${formData.starts_at}:00`).toISOString();
      let matchDateISO;
      try { matchDateISO = new Date(formData.match_date).toISOString(); } catch { matchDateISO = startsAtISO; }

      const endsAtISO = formData.ends_at ? new Date(`${formData.match_date}T${formData.ends_at}:00`).toISOString() : undefined;

      let joinDeadlineISO, cancellationDeadlineISO;
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
        ...(endsAtISO && { ends_at: endsAtISO }),
        location_name: formData.location_name,
        ...(formData.location_details && { location_details: formData.location_details }),
        min_players: Number(formData.min_players),
        max_players: Number(formData.max_players),
        allow_waiting_list: formData.allow_waiting_list,
        visibility: formData.visibility,
        entry_mode: formData.entry_mode,
        ...(joinDeadlineISO && { join_deadline: joinDeadlineISO }),
        ...(cancellationDeadlineISO && { cancellation_deadline: cancellationDeadlineISO }),
        ...(formData.notes && { notes: formData.notes }),
        members_priority_deadline: formData.members_priority_deadline
          ? new Date(formData.members_priority_deadline).toISOString()
          : null,
        team_format: formData.team_format || null,
        members_price: formData.members_price !== "" ? Number(formData.members_price) : null,
        guest_price: formData.guest_price !== "" ? Number(formData.guest_price) : null,
        flat_price: formData.flat_price !== "" ? Number(formData.flat_price) : null,
        ...(formData.players_per_team !== ""
          ? { players_per_team: Number(formData.players_per_team) }
          : {}),
      };

      const res = await fetch(`/api/groups/${groupId}/pregames`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao criar partida", type: "server_error" }));
        return;
      }

      const created = await res.json() as { id: string };
      setCreatedPregameId(created.id);
      setStep(3);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (step === 3) {
    return <SuccessScreen pregameId={createdPregameId} pregameName={formData.name} groupId={groupId} />;
  }

  return (
    <div>
      <StepDots step={step} total={3} />

      {/* ── Step 0: Tipo e Identificação ──────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Que partida é essa?</h2>
            <p className="text-sm text-zinc-500 mt-1">Tipo, nome e quando vai rolar.</p>
          </div>

          {/* Tipo de partida */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Tipo de Partida <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {PREGAME_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => update("type", pt.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                    formData.type === pt.value
                      ? pt.value === "standard"
                        ? "border-green-500/50 bg-green-500/10 text-green-300"
                        : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xl">{pt.emoji}</span>
                  <span className="text-sm font-bold">{pt.label}</span>
                  <span className="text-[10px] text-current opacity-60">{pt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400" htmlFor="name">
              Nome da partida <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Racha de Quinta"
              maxLength={80}
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputCls}
            />
            {formData.name.length > 0 && formData.name.trim().length < 2 && (
              <p className="text-xs text-red-400">Mínimo 2 caracteres</p>
            )}
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.match_date}
                onChange={(e) => update("match_date", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">
                  Início <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.starts_at}
                  onChange={(e) => update("starts_at", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">
                  Fim <span className="text-zinc-600">(opc)</span>
                </label>
                <input
                  type="time"
                  value={formData.ends_at}
                  onChange={(e) => update("ends_at", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canAdvanceStep0()}
            onClick={() => setStep(1)}
            className="w-full rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 transition-colors"
          >
            Próximo →
          </button>
        </div>
      )}

      {/* ── Step 1: Local e Jogadores ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Onde e como jogar</h2>
            <p className="text-sm text-zinc-500 mt-1">Local, formato e quantidade de jogadores.</p>
          </div>

          {/* Local */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">
              Local (Nome da Arena/Quadra) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Arena Copacabana"
              value={formData.location_name}
              onChange={(e) => update("location_name", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">
              Detalhes do Local <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Quadra 3, portão lateral..."
              value={formData.location_details}
              onChange={(e) => update("location_details", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {TEAM_FORMATS.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => update("team_format", tf.value)}
                  className={`rounded-xl border px-4 py-3 text-center text-sm font-bold transition-all ${
                    formData.team_format === tf.value
                      ? "border-green-500/50 bg-green-500/10 text-green-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jogadores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">Mínimo de Jogadores</label>
              <input
                type="number"
                min={2}
                required
                value={formData.min_players}
                onChange={(e) => update("min_players", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-400">Limite Máximo</label>
              <input
                type="number"
                min={formData.min_players}
                required
                value={formData.max_players}
                onChange={(e) => update("max_players", e.target.value)}
                className={inputCls}
              />
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
              placeholder="Ex.: 7 — usado no sorteio e sugestões"
              value={formData.players_per_team}
              onChange={(e) => update("players_per_team", e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-zinc-500">
              Entre 2 e o limite máximo. Ajuda a pré-preencher o sorteio por jogadores por time.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-5 py-3 transition-colors"
            >
              ← Voltar
            </button>
            <button
              type="button"
              disabled={!canAdvanceStep1()}
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Regras e Custos ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Regras e custos</h2>
            <p className="text-sm text-zinc-500 mt-1">Entrada, lista de espera e valores.</p>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <ToggleSwitch
              label="Lista de Espera"
              description={formData.allow_waiting_list ? "Jogadores podem entrar na fila se lotar" : "Sem fila de espera quando lotar"}
              checked={formData.allow_waiting_list}
              onChange={() => update("allow_waiting_list", !formData.allow_waiting_list)}
            />

            <ToggleSwitch
              label="Público para preencher vagas"
              description={formData.visibility === "public_to_fill_spots" ? "Qualquer um pode ver se sobrar vaga" : "Apenas membros do grupo podem ver"}
              checked={formData.visibility === "public_to_fill_spots"}
              onChange={() => update("visibility", formData.visibility === "public_to_fill_spots" ? "private" : "public_to_fill_spots")}
            />

            <ToggleSwitch
              label="Requer Aprovação"
              description={formData.entry_mode === "approval_required" ? "Admin deve aprovar os confirmados" : "Entrada automática ao confirmar presença"}
              checked={formData.entry_mode === "approval_required"}
              onChange={() => update("entry_mode", formData.entry_mode === "approval_required" ? "automatic" : "approval_required")}
            />
          </div>

          {/* Custos */}
          <div className="space-y-4">
            <label className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Custos da Partida</label>

            {formData.type === "standard" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Valor para Mensalistas</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0,00"
                      value={formData.members_price}
                      onChange={(e) => update("members_price", e.target.value)}
                      className={inputCls + " pl-9"}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">Deixe zerado se coberto pela mensalidade</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Valor para Avulsos (Convidados)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0,00"
                      value={formData.guest_price}
                      onChange={(e) => update("guest_price", e.target.value)}
                      className={inputCls + " pl-9"}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">Preço pago por jogo</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-400">Valor Único (Para todos)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0,00"
                    value={formData.flat_price}
                    onChange={(e) => update("flat_price", e.target.value)}
                    className={inputCls + " pl-9"}
                  />
                </div>
                <span className="text-[11px] text-zinc-500">Partidas Extras cobram o mesmo valor de todos (mensalistas e avulsos)</span>
              </div>
            )}
          </div>

          {/* Avançado */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/40 transition-colors"
            >
              <span className="font-bold tracking-widest text-zinc-500 uppercase">Avançado (Opcional)</span>
              <svg className={`w-5 h-5 text-zinc-500 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="p-5 pt-0 border-t border-zinc-800/60 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Horário limite para entrar</label>
                    <input
                      type="time"
                      title="Horário limite no dia da partida"
                      value={formData.join_deadline}
                      onChange={(e) => update("join_deadline", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Horário limite para sair</label>
                    <input
                      type="time"
                      title="Horário limite no dia da partida para cancelar sem punição"
                      value={formData.cancellation_deadline}
                      onChange={(e) => update("cancellation_deadline", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {formData.type === "standard" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-zinc-400">Prazo de prioridade para mensalistas</label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={formData.members_priority_deadline}
                        onChange={(e) => update("members_priority_deadline", e.target.value)}
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
                      Mensalistas têm prioridade de inscrição até este horário. Avulsos só poderão entrar após o prazo.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Observações adicionais</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Trazer colete branco e preto"
                    value={formData.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className={inputCls + " resize-none"}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-5 py-3 transition-colors"
            >
              ← Voltar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Partida 🚀"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
