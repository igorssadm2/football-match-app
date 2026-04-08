"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useError, parseBackendError } from "@/contexts/ErrorContext";

// ─── Types ──────────────────────────────────────────────────────────────────

type FieldType = "futsal" | "society" | "campo" | "areia";
type Intensity = "light" | "medium" | "heavy";
type Privacy = "private" | "public";

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; emoji: string; desc: string }[] = [
  { value: "futsal",  label: "Futsal",   emoji: "🏟️", desc: "Salão / quadra coberta" },
  { value: "society", label: "Society",  emoji: "⚽", desc: "Grama sintética, 6x6 ou 7x7" },
  { value: "campo",   label: "Campo",    emoji: "🌿", desc: "Grama natural" },
  { value: "areia",   label: "Areia",    emoji: "🏖️", desc: "Beach soccer" },
];

const INTENSITIES: { value: Intensity; label: string; desc: string; color: string; active: string }[] = [
  { value: "light",  label: "Casual",      desc: "Recreativo, sem competição", color: "border-sky-500/30 text-sky-300",    active: "bg-sky-500/15 border-sky-500/50 text-sky-200" },
  { value: "medium", label: "Competitivo", desc: "Jogo sério, mas amigável",   color: "border-amber-500/30 text-amber-300", active: "bg-amber-500/15 border-amber-500/50 text-amber-200" },
  { value: "heavy",  label: "Profissional",desc: "Alta intensidade",           color: "border-red-500/30 text-red-300",    active: "bg-red-500/15 border-red-500/50 text-red-200" },
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

// ─── Success Screen ──────────────────────────────────────────────────────────

function SuccessScreen({ groupId, groupName, inviteToken }: { groupId: string; groupName: string; inviteToken?: string }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`
    : null;

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert(inviteUrl);
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-6 py-6">
      {/* Animated checkmark */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-zinc-100">Grupo criado! 🎉</h2>
        <p className="text-sm text-zinc-400 mt-1">
          <strong className="text-zinc-200">{groupName}</strong> está pronto para rolar.
        </p>
      </div>

      {/* Invite link */}
      {inviteUrl && (
        <div className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Link de Convite</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500 font-mono truncate flex-1">{inviteUrl}</p>
            <button
              onClick={copyLink}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="w-full flex flex-col gap-3">
        <Link
          href={`/grupos/${groupId}/pregames/novo`}
          className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3.5 px-6 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Criar Primeira Partida
        </Link>
        <Link
          href={`/grupos/${groupId}`}
          className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 px-6 transition-colors text-sm text-center"
        >
          Ver o grupo
        </Link>
      </div>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export default function CreateGroupForm() {
  const router = useRouter();
  const { pushError } = useError();

  // Step 0 = Identificação, 1 = Jogo, 2 = Privacidade, 3 = Sucesso
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Post-creation state
  const [createdGroupId, setCreatedGroupId] = useState("");
  const [inviteToken, setInviteToken] = useState<string | undefined>();

  // Step 0 — Identification
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");

  // Step 1 — Game settings
  const [fieldType, setFieldType]   = useState<FieldType>("society");
  const [intensity, setIntensity]   = useState<Intensity>("medium");
  const [maxMembers, setMaxMembers] = useState(0);

  // Step 2 — Privacy
  const [privacy, setPrivacy]             = useState<Privacy>("private");
  const [approvalRequired, setApproval] = useState(false);

  // ── Validation ──────────────────────────────────────────────────────────────
  function canAdvanceStep0() { return name.trim().length >= 2; }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // GroupSettings no backend ainda não inclui access/privacidade; não enviar evita expectativa falsa.
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        settings: {
          max_members: maxMembers,
          sport: "football",
          football_config: {
            field_type: fieldType,
            intensity,
          },
        },
      };

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao criar grupo", type: "server_error" }));
        return;
      }

      const data = await res.json() as { id: string; invite_token?: string; invitation?: { token?: string } };
      const gid = data.id;
      setCreatedGroupId(gid);
      setInviteToken(data.invite_token ?? data.invitation?.token);

      // Try to generate an invite link
      try {
        const invRes = await fetch(`/api/groups/${gid}/invitations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ max_uses: 0 }),
        });
        if (invRes.ok) {
          const invData = await invRes.json() as { token?: string };
          if (invData.token) setInviteToken(invData.token);
        }
      } catch {
        // Non-fatal — success screen still shows without invite link
      }

      setStep(3);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (step === 3) {
    return <SuccessScreen groupId={createdGroupId} groupName={name} inviteToken={inviteToken} />;
  }

  return (
    <div>
      <StepDots step={step} total={3} />

      {/* ── Step 0: Identificação ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Identifique seu grupo</h2>
            <p className="text-sm text-zinc-500 mt-1">Como a galera vai te encontrar.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400" htmlFor="name">
              Nome do grupo <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Amigos do Quinta-feira"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
            {name.length > 0 && name.trim().length < 2 && (
              <p className="text-xs text-red-400">Mínimo 2 caracteres</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400" htmlFor="description">
              Descrição <span className="text-zinc-600">(opcional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Regras internas, avisos sobre atrasos, nível do grupo..."
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls + " resize-none"}
            />
            <p className="text-[10px] text-zinc-600 text-right">{description.length}/500</p>
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

      {/* ── Step 1: Definições de Jogo ────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Definições de Jogo</h2>
            <p className="text-sm text-zinc-500 mt-1">Pré-configura as futuras partidas do grupo.</p>
          </div>

          {/* Modalidade */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Modalidade Principal <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFieldType(ft.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                    fieldType === ft.value
                      ? "border-green-500/50 bg-green-500/10 text-green-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xl">{ft.emoji}</span>
                  <span className="text-sm font-bold">{ft.label}</span>
                  <span className="text-[10px] text-current opacity-60">{ft.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensidade */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Nível Técnico do Grupo</label>
            <div className="flex flex-col gap-2">
              {INTENSITIES.map((int) => (
                <button
                  key={int.value}
                  type="button"
                  onClick={() => setIntensity(int.value)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    intensity === int.value
                      ? int.active
                      : `border-zinc-700 bg-zinc-800/60 hover:border-zinc-600 ${int.color}`
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${
                    intensity === int.value ? "bg-current border-current" : "border-zinc-600"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{int.label}</p>
                    <p className="text-[10px] opacity-70">{int.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Capacidade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400" htmlFor="max_members">
              Capacidade máxima <span className="text-zinc-600">(0 = ilimitado)</span>
            </label>
            <input
              id="max_members"
              type="number"
              min={0}
              max={200}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className={inputCls}
            />
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
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3 transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Privacidade ───────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-zinc-100">Configurações de Acesso</h2>
            <p className="text-sm text-zinc-500 mt-1">Quem pode entrar no grupo.</p>
            <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
              Privacidade e aprovação de membros ainda não são salvas no servidor; em breve. O grupo é criado com as regras padrão do backend.
            </p>
          </div>

          {/* Privacy type */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Tipo de Grupo</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  privacy === "private"
                    ? "border-indigo-500/50 bg-indigo-500/10"
                    : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600"
                }`}
              >
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacy === "private" ? "text-indigo-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className={`text-sm font-bold ${privacy === "private" ? "text-indigo-300" : "text-zinc-300"}`}>Privado</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Apenas via link ou convite direto</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  privacy === "public"
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600"
                }`}
              >
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${privacy === "public" ? "text-green-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                <div>
                  <p className={`text-sm font-bold ${privacy === "public" ? "text-green-300" : "text-zinc-300"}`}>Público</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Aparece em Explorar para jogadores próximos</p>
                </div>
              </button>
            </div>
          </div>

          {/* Approval toggle */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
            <button
              type="button"
              onClick={() => setApproval((v) => !v)}
              className="w-full flex items-center justify-between gap-4"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-200">Aprovação de Membros</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {approvalRequired
                    ? "Você deve aceitar cada novo integrante"
                    : "Entrada automática para quem tiver o link"}
                </p>
              </div>
              {/* Toggle */}
              <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${approvalRequired ? "bg-green-500" : "bg-zinc-700"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${approvalRequired ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </button>
          </div>

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
                "Criar Grupo 🚀"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
