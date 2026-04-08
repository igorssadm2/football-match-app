"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useError, parseBackendError } from "@/contexts/ErrorContext";

interface AddressData {
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

interface ProfileFormData {
  height_cm: string;
  weight_kg: string;
  shoe_size: string;
  address: AddressData;
}

interface MarketingQuestion {
  id: string;
  label: string;
  options: string[];
}

interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  min_value: number;
  max_value: number;
}

interface SportEntry {
  sport: string;
  answers: Record<string, string>;
}

type SportSubStep = "skills" | "marketing";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const TAMANHOS_PE = Array.from({ length: 16 }, (_, i) => String(33 + i));

const ESPORTES = [
  { value: "football",   label: "Futebol" },
  { value: "basketball", label: "Basquete" },
  { value: "tennis",     label: "Tênis" },
  { value: "volleyball", label: "Vôlei" },
  { value: "swimming",   label: "Natação" },
];

const INITIAL_PROFILE: ProfileFormData = {
  height_cm: "",
  weight_kg: "",
  shoe_size: "",
  address: {
    zip_code: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", country: "BR",
  },
};

export default function CadastroForm({ startAtSurvey = false }: { startAtSurvey?: boolean }) {
  const router = useRouter();
  const { pushError } = useError();

  function isUnauthorized(res: Response): boolean {
    if (res.status === 401) {
      router.push("/");
      return true;
    }
    return false;
  }

  // Step 1: profile data
  const [form, setForm] = useState<ProfileFormData>(INITIAL_PROFILE);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Step 2: sports & marketing
  const [step, setStep] = useState<1 | 2>(startAtSurvey ? 2 : 1);
  const registrationShownAt = useRef<Date>(new Date());
  const marketingShownAt = useRef<Date | null>(null);
  
  const [savedSports, setSavedSports] = useState<{ sport: string; label: string }[]>([]);
  const [currentEntry, setCurrentEntry] = useState<SportEntry>({ sport: "", answers: {} });
  const [questions, setQuestions] = useState<Record<string, MarketingQuestion[]>>({});
  
  const [loadingCurrentQuestions, setLoadingCurrentQuestions] = useState(false);
  const [savingCurrentSport, setSavingCurrentSport] = useState(false);

  // Skills sub-step
  const [sportSubStep, setSportSubStep] = useState<SportSubStep>("skills");
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [skillDefs, setSkillDefs] = useState<SkillDefinition[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const skillsShownAt = useRef<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step !== 2) return;
    marketingShownAt.current = new Date();
  }, [step]);

  // ─── Address helpers ──────────────────────────────────────────────────────

  function setAddr(field: keyof AddressData, value: string) {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  }

  async function handleCepBlur() {
    const cep = form.address.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoadingCep(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado."); return; }
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        },
      }));
    } catch {
      setCepError("Erro ao buscar CEP. Preencha manualmente.");
    } finally {
      setLoadingCep(false);
    }
  }

  function formatCep(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  // ─── Sport & questions helpers ────────────────────────────────────────────

  async function fetchMarketingQuestions(sport: string) {
    if (!sport || questions[sport]) return;
    setLoadingCurrentQuestions(true);
    try {
      const res = await fetch(`/api/marketingQuestions/${sport}`);
      if (!res.ok) {
        isUnauthorized(res);
        return;
      }
      const data = await res.json();
      const list: MarketingQuestion[] = Array.isArray(data) ? data : [];
      setQuestions((prev) => ({ ...prev, [sport]: list }));
    } finally {
      setLoadingCurrentQuestions(false);
    }
  }

  async function handleCurrentSportChange(sport: string) {
    setCurrentEntry({ sport, answers: {} });
    setSportSubStep("skills");
    setSkillRatings({});
    setSkillDefs([]);
    if (!sport) return;

    setLoadingSkills(true);
    try {
      const res = await fetch(`/api/skills/${sport}`);
      if (!res.ok) {
        isUnauthorized(res);
        return;
      }
      const data = await res.json();
      setSkillDefs(Array.isArray(data) ? data : []);
      skillsShownAt.current = new Date();
    } finally {
      setLoadingSkills(false);
    }
  }

  function handleSkillRating(skillId: string, value: number) {
    setSkillRatings((prev) => ({ ...prev, [skillId]: value }));
  }

  async function handleProceedToMarketing() {
    if (!currentEntry.sport) return;
    setSavingSkills(true);
    try {
      const skillPayload: Record<string, number> = {};
      for (const s of skillDefs) {
        const v = skillRatings[s.id];
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        skillPayload[s.id] = Math.min(s.max_value, Math.max(s.min_value, Math.round(v)));
      }
      if (Object.keys(skillPayload).length !== skillDefs.length) {
        pushError({
          title: "Habilidades incompletas",
          type: "validation_error",
          message: "Avalie todas as dimensões antes de continuar.",
        });
        return;
      }

      // 1. Save skill ratings (POST /api/v1/users/me/skills/{sport})
      const skillRes = await fetch(`/api/skills/${currentEntry.sport}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skillPayload),
      });
      if (!skillRes.ok) {
        if (isUnauthorized(skillRes)) return;
        pushError(await parseBackendError(skillRes, { title: "Erro ao salvar habilidades", type: "validation_error" }));
        return;
      }

      // 2. PATCH survey-status skills
      const completedAt = new Date();
      const surveyRes = await fetch("/api/marketingQuestions/survey-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_type: "skills",
          shown_at: (skillsShownAt.current ?? new Date()).toISOString(),
          completed_at: completedAt.toISOString(),
        }),
      });
      if (!surveyRes.ok) {
        if (isUnauthorized(surveyRes)) return;
        pushError(await parseBackendError(surveyRes, { title: "Erro ao registrar habilidades", type: "server_error" }));
        return;
      }

      // 3. Fetch marketing questions now
      await fetchMarketingQuestions(currentEntry.sport);
      marketingShownAt.current = new Date();
      setSportSubStep("marketing");
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSavingSkills(false);
    }
  }

  function handleCurrentAnswer(questionId: string, value: string) {
    setCurrentEntry((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: value } }));
  }

  async function handleSaveAndAddSport() {
    if (!currentEntry.sport) return;
    setSavingCurrentSport(true);
    try {
      // 1. Save marketing answers
      const res = await fetch(`/api/marketingQuestions/${currentEntry.sport}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentEntry.answers),
      });
      if (!res.ok) {
        if (isUnauthorized(res)) return;
        pushError(await parseBackendError(res, { title: "Erro ao salvar preferências", type: "validation_error" }));
        return;
      }

      // 2. PATCH marketing survey-status
      const marketingStatusRes = await fetch("/api/marketingQuestions/survey-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_type: "marketing",
          shown_at: (marketingShownAt.current ?? registrationShownAt.current).toISOString(),
          completed_at: new Date().toISOString(),
        }),
      });
      if (!marketingStatusRes.ok) {
        if (isUnauthorized(marketingStatusRes)) return;
        pushError(await parseBackendError(marketingStatusRes, { title: "Erro ao salvar preferências", type: "server_error" }));
        return;
      }

      const label = ESPORTES.find((e) => e.value === currentEntry.sport)?.label ?? currentEntry.sport;
      setSavedSports((prev) => [...prev, { sport: currentEntry.sport, label }]);
      setCurrentEntry({ sport: "", answers: {} });
      setSportSubStep("skills");
      setSkillRatings({});
      setSkillDefs([]);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSavingCurrentSport(false);
    }
  }

  // ─── Submission ───────────────────────────────────────────────────────────

  function handleAdvance(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Save profile (skip if redirected directly to survey)
      if (!startAtSurvey) {
        const profileRes = await fetch("/api/cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            height_cm: Number(form.height_cm),
            weight_kg: Number(form.weight_kg),
            shoe_size: Number(form.shoe_size),
            address: {
              ...form.address,
              zip_code: form.address.zip_code.replace(/\D/g, ""),
            },
          }),
        });
        if (!profileRes.ok) {
          if (isUnauthorized(profileRes)) return;
          pushError(await parseBackendError(profileRes, { title: "Erro ao salvar perfil", type: "validation_error" }));
          return;
        }
      }

      // 2. Save registration survey status
      if (!startAtSurvey) {
        const completedAt = new Date();
        await fetch("/api/marketingQuestions/survey-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            survey_type: "registration",
            shown_at: registrationShownAt.current.toISOString(),
            completed_at: completedAt.toISOString(),
          }),
        }).catch(() => {});
      }

      // 3. Save current sport marketing answers (user is on marketing sub-step)
      if (currentEntry.sport) {
        const answersRes = await fetch(`/api/marketingQuestions/${currentEntry.sport}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentEntry.answers),
        });
        if (!answersRes.ok) {
          if (isUnauthorized(answersRes)) return;
          pushError(await parseBackendError(answersRes, { title: "Erro ao salvar preferências", type: "validation_error" }));
          return;
        }
      }

      // 4. Mark marketing survey as completed
      const completedAt = new Date();
      const finalSurveyRes = await fetch("/api/marketingQuestions/survey-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_type: "marketing",
          shown_at: (marketingShownAt.current ?? registrationShownAt.current).toISOString(),
          completed_at: completedAt.toISOString(),
        }),
      });
      if (!finalSurveyRes.ok) {
        if (isUnauthorized(finalSurveyRes)) return;
        pushError(await parseBackendError(finalSurveyRes, { title: "Erro ao finalizar cadastro", type: "server_error" }));
        return;
      }

      router.push("/dashboard");
    } catch {
      pushError({
        title: "Erro de Conexão",
        type: "network_error",
        message: "Não foi possível conectar ao servidor. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputCls =
    "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 w-full";

  // ─── Step indicator ───────────────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center gap-3 mb-4">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s
                ? "bg-green-500 text-zinc-950"
                : step > s
                ? "bg-green-500/30 text-green-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {s}
          </div>
          <span className={`text-xs font-medium ${step === s ? "text-zinc-200" : "text-zinc-500"}`}>
            {s === 1 ? "Dados pessoais" : "Esportes"}
          </span>
          {s < 2 && <div className={`h-px w-8 ${step > s ? "bg-green-500/40" : "bg-zinc-700"}`} />}
        </div>
      ))}
    </div>
  );

  // ─── Step 1: Profile ──────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <form onSubmit={handleAdvance} className="space-y-4">
        <StepIndicator />

        {/* Dados Físicos */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dados Físicos</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="height_cm">Altura (cm)</label>
              <input
                id="height_cm" type="number" min={100} max={250} required
                placeholder="Ex: 175"
                value={form.height_cm}
                onChange={(e) => setForm((p) => ({ ...p, height_cm: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="weight_kg">Peso (kg)</label>
              <input
                id="weight_kg" type="number" min={20} max={300} step={0.1} required
                placeholder="Ex: 70"
                value={form.weight_kg}
                onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="shoe_size">Tam. do Pé</label>
              <select
                id="shoe_size" required
                value={form.shoe_size}
                onChange={(e) => setForm((p) => ({ ...p, shoe_size: e.target.value }))}
                className={inputCls}
              >
                <option value="" disabled className="text-zinc-500">Nº</option>
                {TAMANHOS_PE.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Endereço</h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="zip_code">CEP</label>
              <div className="relative">
                <input
                  id="zip_code" type="text" required maxLength={9}
                  placeholder="00000-000"
                  value={form.address.zip_code}
                  onChange={(e) => setAddr("zip_code", formatCep(e.target.value))}
                  onBlur={handleCepBlur}
                  className={inputCls}
                />
                {loadingCep && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {cepError && <p className="text-red-400 text-xs">{cepError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="number">Número</label>
              <input
                id="number" type="text" required placeholder="Ex: 42"
                value={form.address.number}
                onChange={(e) => setAddr("number", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="neighborhood">Bairro</label>
              <input
                id="neighborhood" type="text" required placeholder="Bairro"
                value={form.address.neighborhood}
                onChange={(e) => setAddr("neighborhood", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-300" htmlFor="street">Rua / Logradouro</label>
            <input
              id="street" type="text" required placeholder="Nome da rua"
              value={form.address.street}
              onChange={(e) => setAddr("street", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="complement">Complemento</label>
              <input
                id="complement" type="text" placeholder="Apto, bloco..."
                value={form.address.complement}
                onChange={(e) => setAddr("complement", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="city">Cidade</label>
              <input
                id="city" type="text" required placeholder="Cidade"
                value={form.address.city}
                onChange={(e) => setAddr("city", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-300" htmlFor="state">Estado</label>
              <select
                id="state" required
                value={form.address.state}
                onChange={(e) => setAddr("state", e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>UF</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="w-full rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 font-semibold py-2.5 px-4 transition-colors text-sm"
        >
          Próximo passo →
        </button>
      </form>
    );
  }

  // ─── Step 2: Sports, Skills & Marketing ───────────────────────────────────

  const currentSportQuestions = currentEntry.sport ? (questions[currentEntry.sport] ?? []) : [];
  const allSkillsRated =
    skillDefs.length > 0 &&
    skillDefs.every((s) => {
      const v = skillRatings[s.id];
      return typeof v === "number" && v >= s.min_value && v <= s.max_value;
    });
  const currentMarketingAnswered =
    sportSubStep === "marketing" &&
    !!currentEntry.sport &&
    currentSportQuestions.length > 0 &&
    currentSportQuestions.every((q) => !!currentEntry.answers[q.id]);
  const canFinalize = currentMarketingAnswered || savedSports.length > 0;
  const showFinalize = !(currentEntry.sport !== "" && sportSubStep === "skills");
  const canAddMore = currentMarketingAnswered && savedSports.length + 1 < ESPORTES.length;
  const availableSports = ESPORTES.filter((s) => !savedSports.some((ss) => ss.sport === s.value));

  return (
    <form onSubmit={handleFinalSubmit} className="space-y-4">
      <StepIndicator />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Esporte</h2>

        {/* Tags dos esportes já salvos */}
        {savedSports.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedSports.map((s) => (
              <span
                key={s.sport}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-xs font-medium text-green-400"
              >
                ✓ {s.label}
              </span>
            ))}
          </div>
        )}

        {sportSubStep === "skills" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-300" htmlFor="sport-select">
              Qual esporte você vai praticar?
            </label>
            <select
              id="sport-select"
              value={currentEntry.sport}
              onChange={(e) => handleCurrentSportChange(e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>Selecione um esporte</option>
              {availableSports.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Skills sub-step ── */}
        {loadingSkills && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            Carregando habilidades...
          </div>
        )}

        {!loadingSkills && sportSubStep === "skills" && skillDefs.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pt-1">
              Avalie suas habilidades
            </p>
            {skillDefs.map((skill) => {
              const value = skillRatings[skill.id] ?? 0;
              const isRated = value >= skill.min_value;
              const pct = isRated ? (value / skill.max_value) * 100 : 0;
              const fillColor = isRated ? "#22c55e" : "#52525b";
              return (
                <div key={skill.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300 font-medium" htmlFor={`skill-${skill.id}`}>
                      {skill.name}
                    </label>
                    <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full transition-colors ${isRated ? "bg-green-500/15 text-green-400" : "text-zinc-600"}`}>
                      {isRated ? `${value}/${skill.max_value}` : "—"}
                    </span>
                  </div>
                  <input
                    id={`skill-${skill.id}`}
                    type="range"
                    min={0}
                    max={skill.max_value}
                    step={1}
                    value={value}
                    onChange={(e) => handleSkillRating(skill.id, Number(e.target.value))}
                    className={`skill-range w-full ${isRated ? "rated" : "unrated"}`}
                    style={{
                      background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, #3f3f46 ${pct}%, #3f3f46 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>{skill.min_value}</span>
                    <span className="text-zinc-500 italic truncate mx-3">{skill.description}</span>
                    <span>{skill.max_value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Marketing sub-step ── */}
        {loadingCurrentQuestions && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            Carregando perguntas...
          </div>
        )}

        {!loadingCurrentQuestions && sportSubStep === "marketing" && currentSportQuestions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pt-1">
              Dados extras
            </p>
            {currentSportQuestions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1">
                <label className="text-xs text-zinc-300">{q.label}</label>
                <select
                  value={currentEntry.answers[q.id] ?? ""}
                  onChange={(e) => handleCurrentAnswer(q.id, e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Próximo: Preferências button (visible in skills sub-step) ── */}
      {sportSubStep === "skills" && skillDefs.length > 0 && (
        <button
          type="button"
          onClick={handleProceedToMarketing}
          disabled={!allSkillsRated || savingSkills}
          className="w-full rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-4 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {savingSkills ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : "Próximo: Preferências →"}
        </button>
      )}

      {canAddMore && (
        <button
          type="button"
          onClick={handleSaveAndAddSport}
          disabled={savingCurrentSport}
          className="w-full rounded-lg border border-dashed border-zinc-700 hover:border-green-500/50 text-zinc-400 hover:text-green-400 disabled:opacity-50 font-medium py-2.5 px-4 transition-colors text-sm flex items-center justify-center gap-2"
        >
          {savingCurrentSport ? (
            <>
              <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : "+ Cadastrar novo esporte"}
        </button>
      )}

      {showFinalize && <button
        type="submit"
        disabled={submitting || !canFinalize}
        className="w-full rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-4 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            Salvando...
          </>
        ) : "Finalizar cadastro →"}
      </button>}
    </form>
  );
}
