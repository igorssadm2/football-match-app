"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useError, parseBackendError } from "@/contexts/ErrorContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { PendingInvites } from "@/components/pregame/PendingInvites";
import { PreGamesSection } from "@/components/pregame/PreGamesSection";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EventLocation {
  id?: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
  place_id?: string;
  is_preferred?: boolean;
}

interface Occurrence {
  weekday: number;
  start_time: string;
  end_time: string;
}

interface Schedule {
  frequency: string;
  occurrences?: Occurrence[];
  specific_start?: string;
  specific_end?: string;
}

interface Invitation {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  status: string;
  is_valid: boolean;
  is_expired: boolean;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  created_at: string;
}

type Sport = "football";
type FootballFieldType = "society" | "futsal" | "quadra" | "campo" | "areia";
type GameIntensity = "light" | "medium" | "heavy";

interface FootballConfig {
  field_type?: FootballFieldType;
  team_size?: number;
  intensity?: GameIntensity;
}

interface PreGameConfig {
  reminder_minutes?: number;
}

interface GroupSettings {
  max_members: number;
  sport?: Sport;
  football_config?: FootballConfig;
  pre_game?: PreGameConfig;
  preferred_location?: EventLocation;
  locations?: EventLocation[];
  schedule?: Schedule;
}

interface MemberRanking {
  wins: number;
  losses: number;
  draws: number;
  points: number;
  level: number;
  xp: number;
}

type MemberType = "mensalista" | "diarista" | "";

const MEMBER_TYPE_TO_API: Record<string, string> = { mensalista: "monthly", diarista: "day_use" };
const MEMBER_TYPE_FROM_API: Record<string, MemberType> = { monthly: "mensalista", day_use: "diarista" };

interface Member {
  id: string;
  user_id: string;
  name: string;
  picture_url: string;
  role: string;
  member_type: MemberType;
  status: string;
  joined_at: string;
  ranking: MemberRanking;
}

interface Group {
  id: string;
  name: string;
  description: string;
  owner?: Member;
  /** Quando a API manda só o id do dono (snake/camel) */
  owner_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  members: Member[];
  settings: GroupSettings;
}

interface CurrentUser {
  id: string;
  firebase_uid?: string;
  email?: string;
  name?: string;
}

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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputCls =
  "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 w-full";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function truncateId(id: string | undefined | null) {
  if (id == null || id === "") return "—";
  return id.length > 8 ? id.slice(0, 8) + "…" : id;
}

type MemberApi = Member & { userId?: string; pictureUrl?: string };

type RawFootballConfig = {
  field_type?: FootballFieldType;
  fieldType?: FootballFieldType;
  team_size?: number;
  teamSize?: number;
  intensity?: GameIntensity;
};

type RawSettings = {
  max_members?: number;
  maxMembers?: number;
  sport?: Sport;
  football_config?: RawFootballConfig;
  footballConfig?: RawFootballConfig;
  pre_game?: PreGameConfig;
  preGame?: PreGameConfig;
  preferred_location?: EventLocation;
  preferredLocation?: EventLocation;
  locations?: EventLocation[];
  schedule?: Schedule;
};

/** Backend pode enviar snake_case ou camelCase */
function normalizeGroupPayload(raw: unknown): Group {
  const o = raw as Group & { ownerId?: string; members?: MemberApi[]; settings?: RawSettings };
  const members = (o.members ?? []).map((m: MemberApi) => ({
    ...m,
    user_id: m.user_id ?? m.userId ?? "",
    name: m.name ?? "",
    picture_url: m.picture_url ?? m.pictureUrl ?? "",
    member_type: MEMBER_TYPE_FROM_API[m.member_type ?? ""] ?? ((m.member_type ?? "") as MemberType),
  }));
  const owner_id = o.owner_id ?? o.ownerId;

  const s: RawSettings = o.settings ?? {};
  const fc = s.football_config ?? s.footballConfig;
  const preferredLocation = s.preferred_location ?? s.preferredLocation;
  const rawLocations = s.locations ?? [];
  // Se o backend não retornou o array completo mas veio preferred_location, usa ele como fallback
  const locations = rawLocations.length > 0
    ? rawLocations
    : (preferredLocation ? [{ ...preferredLocation, is_preferred: true }] : []);

  const preGame = s.pre_game ?? s.preGame;
  const settings: GroupSettings = {
    max_members: s.max_members ?? s.maxMembers ?? 0,
    sport: s.sport,
    football_config: fc ? {
      field_type: fc.field_type ?? fc.fieldType,
      team_size: fc.team_size ?? fc.teamSize,
      intensity: fc.intensity,
    } : undefined,
    pre_game: preGame,
    preferred_location: preferredLocation,
    locations,
    schedule: s.schedule,
  };

  return {
    ...o,
    settings,
    members,
    ...(owner_id != null && String(owner_id) !== "" ? { owner_id: String(owner_id) } : {}),
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-zinc-500"}`} />
      {isActive ? "Ativo" : status === "archived" ? "Arquivado" : status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isAdmin ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>
      {isAdmin ? "Admin" : "Membro"}
    </span>
  );
}


function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin inline-block" />
  );
}

// ─── Next game countdown ──────────────────────────────────────────────────────

function getNextMatch(preGames: PreGameItem[]): { ms: number; match: PreGameItem } | null {
  if (!preGames.length) return null;
  const now = new Date();
  const futureMatches = preGames
    .map(m => ({
      match: m,
      date: new Date(m.starts_at || m.match_date)
    }))
    .filter(m => m.date > now && m.match.status === "open")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!futureMatches.length) return null;

  const next = futureMatches[0];
  return {
    ms: next.date.getTime() - now.getTime(),
    match: next.match
  };
}

function getNextOccurrenceMs(occurrences: Occurrence[]): { ms: number; occurrence: Occurrence } | null {
  if (!occurrences.length) return null;
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun … 6=Sat
  const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;

  let best: { ms: number; occurrence: Occurrence } | null = null;

  for (const occ of occurrences) {
    const [h, m] = occ.start_time.split(":").map(Number);
    const occMs = h * 3600000 + m * 60000;
    let daysUntil = ((occ.weekday - todayDay + 7) % 7);
    if (daysUntil === 0 && occMs <= nowMs) daysUntil = 7; // already passed today
    const totalMs = daysUntil * 86400000 + (occMs - nowMs);
    if (!best || totalMs < best.ms) best = { ms: totalMs, occurrence: occ };
  }
  return best;
}

function NextGameCountdown({ preGames, schedule }: { preGames: PreGameItem[]; schedule: Schedule | undefined }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const nextMatch = getNextMatch(preGames);
  const nextOcc = getNextOccurrenceMs(schedule?.occurrences || []);
  
  // Prefer actual match, fallback to recurring schedule
  const next = nextMatch || nextOcc;
  if (!next) return null;

  const totalSec = Math.floor(next.ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const isToday = d === 0;
  const isTomorrow = d === 1;

  let dayLabel = "";
  let timeLabel = "";

  if ("match" in next) {
    const date = new Date(next.match.starts_at || next.match.match_date);
    dayLabel = isToday ? "Hoje" : isTomorrow ? "Amanhã" : WEEKDAYS[date.getDay()];
    timeLabel = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } else {
    dayLabel = isToday ? "Hoje" : isTomorrow ? "Amanhã" : WEEKDAYS[next.occurrence.weekday];
    timeLabel = next.occurrence.start_time;
  }

  return (
    <div className="relative rounded-2xl border border-green-500/20 bg-green-500/5 overflow-hidden px-5 py-4 flex items-center gap-4">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-green-500/50 via-green-500/20 to-transparent" />

      {/* Icon */}
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-xl bg-green-500/20 blur-sm" />
        <div className="relative w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-widest text-green-400/70 uppercase">Próxima pelada</p>
        <p className="text-sm font-bold text-zinc-200 mt-0.5">
          {dayLabel} às {timeLabel}
        </p>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-1.5 shrink-0">
        {d > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tabular-nums text-zinc-100 leading-none">{String(d).padStart(2, "0")}</span>
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">dia{d !== 1 ? "s" : ""}</span>
          </div>
        )}
        {d > 0 && <span className="text-zinc-700 font-bold text-lg mb-2">:</span>}
        <div className="flex flex-col items-center">
          <span className="text-xl font-black tabular-nums text-zinc-100 leading-none">{String(h).padStart(2, "0")}</span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">h</span>
        </div>
        <span className="text-zinc-700 font-bold text-lg mb-2">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl font-black tabular-nums text-zinc-100 leading-none">{String(m).padStart(2, "0")}</span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">min</span>
        </div>
        {d === 0 && (
          <>
            <span className="text-zinc-700 font-bold text-lg mb-2">:</span>
            <div className="flex flex-col items-center">
              <span className={`text-xl font-black tabular-nums leading-none ${s % 2 === 0 ? "text-green-400" : "text-zinc-100"}`}>{String(s).padStart(2, "0")}</span>
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">seg</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "once", label: "Única vez" },
];

function frequencyLabel(f?: string) {
  return FREQUENCIES.find((x) => x.value === f)?.label ?? f ?? "—";
}

// ─── Capacity display + edit ──────────────────────────────────────────────────

function CapacityDisplay({ settings }: { settings: GroupSettings }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="text-sm text-zinc-400">Capacidade máxima</span>
      </div>
      <span className="text-sm font-bold text-zinc-100">
        {settings.max_members === 0 ? "Ilimitado" : `${settings.max_members} membros`}
      </span>
    </div>
  );
}

interface CapacityEditFormProps {
  groupId: string;
  initial: GroupSettings;
  onSave: (updated: Group) => void;
  onCancel: () => void;
}

function CapacityEditForm({ groupId, initial, onSave, onCancel }: CapacityEditFormProps) {
  const { pushError } = useError();
  const [maxMembers, setMaxMembers] = useState(initial.max_members);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { max_members: maxMembers, sport: initial.sport, football_config: initial.football_config, schedule: initial.schedule } }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao salvar configurações", type: "server_error" }));
        return;
      }
      onSave(normalizeGroupPayload(await res.json()));
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-zinc-400">Máx. membros <span className="text-zinc-600">(0 = ilimitado)</span></label>
        <input type="number" min={0} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))} className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-4 text-sm transition-colors flex items-center gap-2">
          {saving ? <><Spinner /> Salvando...</> : "Salvar"}
        </button>
        <button onClick={onCancel} disabled={saving} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm px-4 py-2.5 transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Sport display + edit ────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FootballFieldType, string> = {
  society: "Society",
  futsal:  "Futsal",
  quadra:  "Quadra",
  campo:   "Campo",
  areia:   "Areia",
};

const FIELD_TYPE_DESC: Record<FootballFieldType, string> = {
  society: "Grama sintética",
  futsal:  "Salão / quadra coberta",
  quadra:  "Piso polido",
  campo:   "Grama natural",
  areia:   "Beach soccer / futebol de areia",
};

const INTENSITY_LABELS: Record<GameIntensity, string> = {
  light:  "Leve",
  medium: "Moderada",
  heavy:  "Intensa",
};

const INTENSITY_DESC: Record<GameIntensity, string> = {
  light:  "Casual / recreativo",
  medium: "Competitivo",
  heavy:  "Alta performance",
};

const INTENSITY_COLORS: Record<GameIntensity, string> = {
  light:  "bg-sky-500/10 text-sky-400 border-sky-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  heavy:  "bg-red-500/10 text-red-400 border-red-500/20",
};

// ─── Event display + edit ─────────────────────────────────────────────────────

const FREQ_COLORS: Record<string, string> = {
  weekly:   "bg-violet-500/10 text-violet-400 border-violet-500/20",
  biweekly: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  monthly:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  once:     "bg-green-500/10 text-green-400 border-green-500/20",
};

interface LocationsDisplayProps {
  locations: EventLocation[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onSetPreferred: (id: string) => void;
  onAdd?: () => void;
}

const PIN_PATH = "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z";

function LocationCard({ loc, isAdmin, onDelete, onSetPreferred, compact, onExpand }: {
  loc: EventLocation;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onSetPreferred: (id: string) => void;
  compact?: boolean;
  onExpand?: () => void;
}) {
  const hasAddress = loc.street || loc.neighborhood || loc.city;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-600/60 transition-all group text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-zinc-500 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={PIN_PATH} />
          </svg>
        </div>
        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 truncate flex-1 transition-colors">
          {loc.name || [loc.street, loc.number].filter(Boolean).join(", ") || "Local sem nome"}
        </span>
        <svg className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-zinc-900/60 to-zinc-900/40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-violet-500/5 blur-2xl pointer-events-none" />
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "1.125rem", height: "1.125rem" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={PIN_PATH} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {loc.name && (
                <p className="text-sm font-bold text-zinc-100">{loc.name}</p>
              )}
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <span className="w-1 h-1 rounded-full bg-violet-400 inline-block" />
                Preferido
              </span>
            </div>
            {hasAddress && (
              <div className="mt-1.5 space-y-0.5">
                {(loc.street || loc.number) && (
                  <p className="text-xs text-zinc-400">
                    {[loc.street, loc.number].filter(Boolean).join(", ")}
                    {loc.complement ? <span className="text-zinc-600"> · {loc.complement}</span> : null}
                  </p>
                )}
                {(loc.neighborhood || loc.city) && (
                  <p className="text-xs text-zinc-500">
                    {[loc.neighborhood, loc.city, loc.state].filter(Boolean).join(", ")}
                    {loc.zip_code ? <span className="text-zinc-600"> · CEP {loc.zip_code}</span> : null}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-violet-500/10">
          {loc.maps_url && (
            <a href={loc.maps_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver no Maps
            </a>
          )}
          {isAdmin && loc.id && (
            <button onClick={() => void onDelete(loc.id!)}
              className="ml-auto text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >Remover</button>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationsDisplay({ locations, isAdmin, onDelete, onSetPreferred, onAdd }: LocationsDisplayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);

  if (!locations || locations.length === 0) {
    return isAdmin && onAdd ? (
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center gap-4 py-8 px-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-md" />
            <div className="relative w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={PIN_PATH} />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base font-black text-zinc-100">Onde vai rolar?</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-[180px] mx-auto leading-relaxed">Adicione o campo ou arena onde o grupo se reúne</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm px-5 py-2.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar local
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={PIN_PATH} />
          </svg>
        </div>
        <p className="text-xs text-zinc-600">Nenhum local configurado ainda.</p>
      </div>
    );
  }

  const preferred = locations.find((l) => l.is_preferred);
  const others = locations.filter((l) => !l.is_preferred);

  return (
    <div className="space-y-2">
      {/* Preferred — always full */}
      {preferred ? (
        <LocationCard
          loc={preferred}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onSetPreferred={onSetPreferred}
        />
      ) : (
        /* No preferred set: show first location as full card without preferred badge */
        <div className="relative rounded-xl border border-zinc-700/60 bg-zinc-800/30 overflow-hidden p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-700/50 border border-zinc-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={PIN_PATH} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {locations[0].name && <p className="text-sm font-semibold text-zinc-200">{locations[0].name}</p>}
              {(locations[0].street || locations[0].number) && (
                <p className="text-xs text-zinc-400 mt-0.5">{[locations[0].street, locations[0].number].filter(Boolean).join(", ")}</p>
              )}
              {(locations[0].neighborhood || locations[0].city) && (
                <p className="text-xs text-zinc-500 mt-0.5">{[locations[0].neighborhood, locations[0].city, locations[0].state].filter(Boolean).join(", ")}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {locations[0].maps_url && (
                  <a href={locations[0].maps_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ver no Maps
                  </a>
                )}
                {isAdmin && locations[0].id && (
                  <button onClick={() => onSetPreferred(locations[0].id!)}
                    className="text-xs font-semibold text-zinc-500 hover:text-violet-400 transition-colors"
                  >Definir como preferido</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Others — collapsible compact list */}
      {others.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOthersOpen((v) => !v)}
            className="w-full flex items-center gap-2 py-1.5 px-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors group"
          >
            <div className="flex-1 h-px bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
            <span className="font-semibold whitespace-nowrap">
              {othersOpen ? "Ocultar" : `${others.length} outro${others.length !== 1 ? "s" : ""} local${others.length !== 1 ? "is" : ""}`}
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${othersOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <div className="flex-1 h-px bg-zinc-800 group-hover:bg-zinc-700 transition-colors" />
          </button>

          {othersOpen && (
            <div className="space-y-1.5 mt-1">
              {others.map((loc) =>
                expandedId === loc.id ? (
                  /* Expanded other location */
                  <div key={loc.id} className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={PIN_PATH} />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-zinc-200 flex-1 truncate">
                        {loc.name || "Local sem nome"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-3 pb-3 space-y-0.5">
                      {(loc.street || loc.number) && (
                        <p className="text-xs text-zinc-400">{[loc.street, loc.number].filter(Boolean).join(", ")}{loc.complement ? ` · ${loc.complement}` : ""}</p>
                      )}
                      {(loc.neighborhood || loc.city) && (
                        <p className="text-xs text-zinc-500">{[loc.neighborhood, loc.city, loc.state].filter(Boolean).join(", ")}{loc.zip_code ? ` · CEP ${loc.zip_code}` : ""}</p>
                      )}
                      <div className="flex items-center gap-3 pt-2 flex-wrap">
                        {loc.maps_url && (
                          <a href={loc.maps_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Ver no Maps
                          </a>
                        )}
                        {isAdmin && loc.id && (
                          <>
                            <button onClick={() => { onSetPreferred(loc.id!); setExpandedId(null); }}
                              className="text-xs font-semibold text-zinc-500 hover:text-violet-400 transition-colors"
                            >Tornar preferido</button>
                            <button onClick={() => void onDelete(loc.id!)}
                              className="ml-auto text-xs text-zinc-600 hover:text-red-400 transition-colors"
                            >Remover</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact row */
                  <LocationCard
                    key={loc.id}
                    loc={loc}
                    isAdmin={isAdmin}
                    onDelete={onDelete}
                    onSetPreferred={onSetPreferred}
                    compact
                    onExpand={() => setExpandedId(loc.id ?? null)}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleDisplay({ preGames, settings, isAdmin, onConfigure, onTabChange }: { preGames: PreGameItem[]; settings: GroupSettings; isAdmin?: boolean; onConfigure?: () => void; onTabChange?: (tab: "grupo" | "membros" | "partidas") => void }) {
  const hasPreGames = preGames && preGames.length > 0;
  const sch = settings.schedule;
  const hasSchedule = !!sch?.frequency;

  if (!hasPreGames && !hasSchedule) {
    return isAdmin && onConfigure ? (
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center gap-4 py-8 px-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-md" />
            <div className="relative w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base font-black text-zinc-100">Quando é a pelada?</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-[180px] mx-auto leading-relaxed">Configure o dia e horário das partidas do grupo</p>
          </div>
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 font-semibold text-sm px-5 py-2.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Configurar agenda
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs text-zinc-600">Nenhuma agenda configurada ainda.</p>
      </div>
    );
  }

  // Sort games by date
  const sortedGames = [...preGames]
    .filter(pg => pg.status === "open")
    .sort((a, b) => new Date(a.starts_at || a.match_date).getTime() - new Date(b.starts_at || b.match_date).getTime());

  if (sortedGames.length === 0 && (!sch?.occurrences || sch.occurrences.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs text-zinc-600">Nenhuma partida em aberto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedGames.map((pg) => {
        const date = new Date(pg.starts_at || pg.match_date);
        const startTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return (
          <Link key={pg.id} href={`/pregames/${pg.id}`} className="block transition-transform active:scale-[0.98]">
            <div className="relative flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-4 py-3 overflow-hidden group hover:border-green-500/40 hover:bg-zinc-800/60">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/60 to-green-500/10 rounded-l-xl" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{WEEKDAYS[date.getDay()]}</span>
                <span className="text-sm font-black text-zinc-100 truncate">{pg.name}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-zinc-700/40 px-2.5 py-1.5">
                  <svg className="w-3 h-3 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-mono font-semibold text-zinc-100">{startTime}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {sch?.occurrences?.map((o, i) => (
        <div key={`sch-${i}`} className="relative flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-4 py-3 overflow-hidden opacity-60">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/60 to-green-500/10 rounded-l-xl" />
          <span className="text-sm font-bold text-zinc-200 w-20 shrink-0">{WEEKDAYS[o.weekday]}</span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-zinc-700/40 px-2.5 py-1.5">
              <svg className="w-3 h-3 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-mono font-semibold text-zinc-100">{o.start_time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pre-game display card ────────────────────────────────────────────────────

interface PreGameCardProps {
  settings: GroupSettings;
  isAdmin: boolean;
  onEditClick: () => void;
}

function PreGameCard({ settings, isAdmin, onEditClick }: PreGameCardProps) {
  const mins = settings.pre_game?.reminder_minutes ?? 0;
  const hasReminder = mins > 0;

  const isHours = mins >= 60;
  const displayValue = isHours ? mins / 60 : mins;
  const displayUnit  = isHours ? (displayValue === 1 ? "hora" : "horas") : "min";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasReminder ? "bg-amber-500/10" : "bg-zinc-800"}`}>
            <svg className={`w-3.5 h-3.5 ${hasReminder ? "text-amber-400" : "text-zinc-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-zinc-300">Pré-jogo</h2>
        </div>
        {isAdmin && (
          <button
            onClick={onEditClick}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {hasReminder ? "Editar" : "+ Configurar"}
          </button>
        )}
      </div>

      {/* Body */}
      {hasReminder ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 gap-1">
          {/* Ring visual */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              {/* Track */}
              <circle cx="48" cy="48" r="38" fill="none" stroke="currentColor" strokeWidth="5"
                className="text-zinc-800" />
              {/* Fill — always full since it's a fixed config, not a live countdown */}
              <circle cx="48" cy="48" r="38" fill="none" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * 0.25}`}
                strokeLinecap="round"
                className="text-amber-400"
                stroke="currentColor"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-zinc-100 leading-none tabular-nums">
                {displayValue}
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                {displayUnit}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 text-center mt-1">
            antes do evento
          </p>

          {/* Active badge */}
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Lembrete ativo
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-xs text-zinc-600">Nenhum lembrete configurado.</p>
          {isAdmin && (
            <button
              onClick={onEditClick}
              className="text-xs font-semibold text-amber-400/70 hover:text-amber-400 transition-colors"
            >
              Configurar →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface AddLocationFormProps {
  groupId: string;
  onSave: (location: EventLocation) => void;
  onCancel: () => void;
}

interface ScheduleEditFormProps {
  groupId: string;
  initial: GroupSettings;
  onSave: (schedule: Schedule) => void;
  onCancel: () => void;
}

interface SettingsEditFormProps {
  groupId: string;
  initial: GroupSettings;
  onSave: (updated: Group) => void;
  onCancel: () => void;
}

function AddLocationForm({ groupId, onSave, onCancel }: AddLocationFormProps) {
  const { pushError } = useError();
  const [saving, setSaving] = useState(false);
  const [locName, setLocName] = useState("");
  const [locMapsUrl, setLocMapsUrl] = useState("");
  const [locStreet, setLocStreet] = useState("");
  const [locNumber, setLocNumber] = useState("");
  const [locComplement, setLocComplement] = useState("");
  const [locNeighborhood, setLocNeighborhood] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locZip, setLocZip] = useState("");
  const [locCountry, setLocCountry] = useState("Brasil");
  const [setAsPreferred, setSetAsPreferred] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        name: locName || undefined,
        maps_url: locMapsUrl || undefined,
        street: locStreet || undefined,
        number: locNumber || undefined,
        complement: locComplement || undefined,
        neighborhood: locNeighborhood || undefined,
        city: locCity || undefined,
        state: locState || undefined,
        zip_code: locZip || undefined,
        country: locCountry || undefined,
        set_as_preferred: setAsPreferred,
      };
      const res = await fetch(`/api/groups/${groupId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { pushError(await parseBackendError(res, { title: "Erro ao adicionar local", type: "server_error" })); return; }
      const data = await res.json() as { location: EventLocation };
      onSave(data.location);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-zinc-500">Nome do local</label>
        <input type="text" placeholder="Ex: Arena Futebol 7" value={locName} onChange={(e) => setLocName(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-zinc-500">Link do Google Maps</label>
        <input type="url" placeholder="https://maps.google.com/..." value={locMapsUrl} onChange={(e) => setLocMapsUrl(e.target.value)} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Rua</label>
          <input type="text" placeholder="Rua Exemplo" value={locStreet} onChange={(e) => setLocStreet(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Número</label>
          <input type="text" placeholder="123" value={locNumber} onChange={(e) => setLocNumber(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Complemento</label>
          <input type="text" placeholder="Apto, Bloco..." value={locComplement} onChange={(e) => setLocComplement(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Bairro</label>
          <input type="text" value={locNeighborhood} onChange={(e) => setLocNeighborhood(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Cidade</label>
          <input type="text" value={locCity} onChange={(e) => setLocCity(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">Estado</label>
          <input type="text" placeholder="SP" maxLength={2} value={locState} onChange={(e) => setLocState(e.target.value.toUpperCase())} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">CEP</label>
          <input type="text" placeholder="00000-000" value={locZip} onChange={(e) => setLocZip(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500">País</label>
          <input type="text" placeholder="Brasil" value={locCountry} onChange={(e) => setLocCountry(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={setAsPreferred} onChange={(e) => setSetAsPreferred(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-green-500/30" />
        <span className="text-xs text-zinc-400">Definir como local preferido</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-4 text-sm transition-colors flex items-center gap-2">
          {saving ? <><Spinner /> Salvando...</> : "Adicionar"}
        </button>
        <button onClick={onCancel} disabled={saving} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm px-4 py-2.5 transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

const FREQ_OPTIONS = [
  { value: "weekly",   label: "Semanal",    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { value: "biweekly", label: "Quinzenal",  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { value: "monthly",  label: "Mensal",     icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { value: "once",     label: "Única vez",  icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
];

function ScheduleEditForm({ groupId, initial, onSave, onCancel }: ScheduleEditFormProps) {
  const { pushError } = useError();
  const [saving, setSaving] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[]>(
    initial.schedule?.occurrences?.length
      ? initial.schedule.occurrences
      : [{ weekday: 6, start_time: "09:00", end_time: "10:00" }]
  );

  function addOccurrence() {
    setOccurrences((prev) => [...prev, { weekday: 6, start_time: "09:00", end_time: "10:00" }]);
  }
  function removeOccurrence(i: number) { setOccurrences((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateOccurrence(i: number, field: keyof Occurrence, value: string | number) {
    setOccurrences((prev) => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const schedule: Schedule = { frequency: "weekly", occurrences };
      const res = await fetch(`/api/groups/${groupId}/schedule`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });
      if (!res.ok) { pushError(await parseBackendError(res, { title: "Erro ao salvar agenda", type: "server_error" })); return; }
      const data = await res.json() as { schedule: Schedule };
      onSave(data.schedule);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Dia e horário</p>
          <button type="button" onClick={addOccurrence}
            className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar dia
          </button>
        </div>

        {occurrences.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 py-5 text-center">
            <p className="text-xs text-zinc-600">Nenhum dia configurado. Adicione pelo menos um.</p>
          </div>
        )}

        {occurrences.map((o, i) => (
          <div key={i} className="relative rounded-xl border border-zinc-700/60 bg-zinc-800/30 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/60 to-green-500/10" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 pl-4">
              <select
                value={o.weekday}
                onChange={(e) => updateOccurrence(i, "weekday", Number(e.target.value))}
                className="w-full sm:flex-1 rounded-lg bg-zinc-700 border-0 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                {WEEKDAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
              </select>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="time"
                  value={o.start_time}
                  onChange={(e) => updateOccurrence(i, "start_time", e.target.value)}
                  className="flex-1 sm:flex-none rounded-lg bg-zinc-700 border-0 px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 tabular-nums min-w-0"
                />
                <span className="text-zinc-600 shrink-0">→</span>
                <input
                  type="time"
                  value={o.end_time}
                  onChange={(e) => updateOccurrence(i, "end_time", e.target.value)}
                  className="flex-1 sm:flex-none rounded-lg bg-zinc-700 border-0 px-2 py-2 text-sm text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 tabular-nums min-w-0"
                />
                <button type="button" onClick={() => removeOccurrence(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving || occurrences.length === 0}
          className="rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 px-4 text-sm transition-colors flex items-center gap-2"
        >
          {saving ? <><Spinner /> Salvando...</> : "Salvar"}
        </button>
        <button onClick={onCancel} disabled={saving}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm px-4 py-2.5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Info edit form ──────────────────────────────────────────────────────────

interface InfoEditFormProps {
  groupId: string;
  initial: { name: string; description: string; settings: GroupSettings };
  onSave: (updated: Group) => void;
  onCancel: () => void;
}

function InfoEditForm({ groupId, initial, onSave, onCancel }: InfoEditFormProps) {
  const { pushError } = useError();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [sport, setSport] = useState<Sport | "">(initial.settings.sport ?? "");
  const [fieldType, setFieldType] = useState<FootballFieldType | "">(initial.settings.football_config?.field_type ?? "");
  const [teamSize, setTeamSize] = useState(initial.settings.football_config?.team_size ?? 3);
  const [intensity, setIntensity] = useState<GameIntensity | "">(initial.settings.football_config?.intensity ?? "");
  const [reminderMinutes, setReminderMinutes] = useState<number>(initial.settings.pre_game?.reminder_minutes ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const football_config = sport === "football"
        ? { field_type: fieldType || undefined, team_size: teamSize || undefined, intensity: intensity || undefined }
        : undefined;
      const pre_game = reminderMinutes > 0 ? { reminder_minutes: reminderMinutes } : undefined;
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          settings: {
            max_members: initial.settings.max_members,
            sport: sport || undefined,
            football_config,
            pre_game,
            schedule: initial.settings.schedule,
          },
        }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao atualizar grupo", type: "server_error" }));
        return;
      }
      onSave(normalizeGroupPayload(await res.json()));
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">

      {/* ── Nome ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do grupo"
          className="w-full bg-transparent text-2xl font-black text-zinc-100 placeholder-zinc-700 focus:outline-none border-b-2 border-zinc-700 focus:border-green-500 pb-2 transition-colors"
        />
        <p className="text-xs text-zinc-600 text-right">{name.length} / 60</p>
      </div>

      {/* ── Descrição ─────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Descrição</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte sobre o grupo, regras, quem pode participar..."
          className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 resize-none transition-colors"
        />
        <p className="text-xs text-zinc-600 text-right">{description.length} caracteres</p>
      </div>

      {/* ── Modalidade ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Modalidade</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Sport card */}
        <button
          type="button"
          onClick={() => setSport(sport === "football" ? "" : "football")}
          className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
            sport === "football"
              ? "border-green-500/40 bg-gradient-to-r from-green-500/5 to-transparent"
              : "border-zinc-700/60 bg-zinc-800/30 hover:border-zinc-600"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors ${sport === "football" ? "bg-green-500/10" : "bg-zinc-700/40"}`}>
            ⚽
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-sm ${sport === "football" ? "text-green-400" : "text-zinc-400"}`}>Futebol</p>
            <p className="text-xs text-zinc-600 mt-0.5">Society · Futsal · Quadra · Campo</p>
          </div>
          <div className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${sport === "football" ? "bg-green-500 scale-100" : "border border-zinc-700 scale-95"}`}>
            {sport === "football" && (
              <svg className="w-3 h-3 text-zinc-950" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>

        {/* Football config */}
        {sport === "football" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-800/20 p-4 space-y-5">

            {/* Field type */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Tipo de campo</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FIELD_TYPE_LABELS) as FootballFieldType[]).map((ft) => {
                  const active = fieldType === ft;
                  return (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFieldType(ft === fieldType ? "" : ft)}
                      className={`flex flex-col gap-0.5 p-3 rounded-xl border text-left transition-all ${
                        active
                          ? "border-green-500/50 bg-green-500/8 text-green-400"
                          : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-bold">{FIELD_TYPE_LABELS[ft]}</span>
                      <span className={`text-[10px] ${active ? "text-green-600" : "text-zinc-600"}`}>{FIELD_TYPE_DESC[ft]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team size stepper */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Jogadores por time</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setTeamSize((s) => Math.max(3, s - 1))}
                  disabled={teamSize <= 3}
                  className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-300 text-xl font-bold transition-all"
                >−</button>
                <div className="flex-1 text-center">
                  <p className="text-4xl font-black text-zinc-100 leading-none">
                    {teamSize}
                    <span className="text-zinc-500 text-xl font-bold">v{teamSize}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeamSize((s) => Math.min(11, s + 1))}
                  disabled={teamSize >= 11}
                  className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-300 text-xl font-bold transition-all"
                >+</button>
              </div>
            </div>

            {/* Intensidade */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Intensidade</p>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "medium", "heavy"] as GameIntensity[]).map((lvl) => {
                  const active = intensity === lvl;
                  const colors = {
                    light:  active ? "border-sky-500/50 bg-sky-500/8 text-sky-400" : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300",
                    medium: active ? "border-amber-500/50 bg-amber-500/8 text-amber-400" : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300",
                    heavy:  active ? "border-red-500/50 bg-red-500/8 text-red-400" : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300",
                  };
                  const icons = { light: "🌱", medium: "🔥", heavy: "⚡" };
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIntensity(lvl === intensity ? "" : lvl)}
                      className={`flex flex-col gap-0.5 p-3 rounded-xl border text-left transition-all ${colors[lvl]}`}
                    >
                      <span className="text-base">{icons[lvl]}</span>
                      <span className="text-xs font-bold">{INTENSITY_LABELS[lvl]}</span>
                      <span className={`text-[10px] ${active ? "opacity-70" : "text-zinc-600"}`}>{INTENSITY_DESC[lvl]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Pré-jogo ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Pré-jogo</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-800/20 p-4 space-y-4">
          {/* Reminder */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Lembrete</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Aviso automático antes do evento</p>
              </div>
              {reminderMinutes > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
                  {reminderMinutes >= 60
                    ? `${reminderMinutes / 60}h antes`
                    : `${reminderMinutes}min antes`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 30, 60, 90, 120, 240].map((min) => {
                const label = min === 0 ? "Desativado" : min < 60 ? `${min}min` : `${min / 60}h`;
                const active = reminderMinutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setReminderMinutes(min)}
                    className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? "border-green-500/50 bg-green-500/10 text-green-400"
                        : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {min === 0 ? (
                      <svg className="w-3.5 h-3.5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ações ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-500/40 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <><Spinner /> Salvando...</> : "Salvar alterações"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm px-5 py-3 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Member card ─────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: Member;
  currentUserId: string;
  isAdmin: boolean;
  groupId: string;
  showStats: boolean;
  onRemove: (memberId: string) => void;
  onUpdateMember: (memberId: string, patch: Partial<Member>) => void;
}

function MemberCard({ member, currentUserId, isAdmin, groupId, showStats, onRemove, onUpdateMember }: MemberCardProps) {
  const { pushError } = useError();
  const { confirm } = useConfirm();
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [updatingType, setUpdatingType] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isSelf = member.user_id === currentUserId;

  async function handleRemove() {
    const ok = await confirm({
      title: "Remover membro?",
      description: `${member.name || truncateId(member.user_id)} será removido do grupo. Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${member.id}`, { method: "DELETE" });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao remover membro", type: "server_error" }));
        return;
      }
      onRemove(member.id);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setRemoving(false);
    }
  }

  async function handleToggleRole() {
    const newRole = member.role === "admin" ? "member" : "admin";
    const isPromotion = newRole === "admin";
    const ok = await confirm({
      title: isPromotion ? "Promover a administrador?" : "Rebaixar a membro?",
      description: isPromotion
        ? `${member.name || truncateId(member.user_id)} terá acesso total de administrador.`
        : `${member.name || truncateId(member.user_id)} perderá os privilégios de administrador.`,
      confirmLabel: isPromotion ? "Promover" : "Rebaixar",
      variant: isPromotion ? "info" : "warning",
    });
    if (!ok) return;
    setUpdatingRole(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao atualizar papel", type: "server_error" }));
        return;
      }
      const updated = await res.json() as Member;
      onUpdateMember(member.id, { role: updated.role });
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleSetType(newType: MemberType) {
    if (newType === member.member_type) return;
    setUpdatingType(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_type: MEMBER_TYPE_TO_API[newType] ?? newType, role: member.role }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao atualizar tipo", type: "server_error" }));
        return;
      }
      const updated = await res.json() as Member;
      const normalized = MEMBER_TYPE_FROM_API[updated.member_type as string] ?? updated.member_type;
      onUpdateMember(member.id, { member_type: normalized });
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setUpdatingType(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-zinc-900/40 overflow-hidden transition-colors ${
      expanded ? "border-zinc-700" : "border-zinc-800"
    }`}>
      {/* Identity row */}
      <div
        className={`flex items-center gap-3 px-4 pt-4 pb-3 transition-all duration-150 ${isAdmin && !isSelf ? "cursor-pointer select-none active:scale-[0.98] active:opacity-80" : ""}`}
        onClick={() => { if (isAdmin && !isSelf) setExpanded((v) => !v); }}
      >
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
          {member.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.picture_url} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
              {member.name ? member.name.slice(0, 2).toUpperCase() : member.user_id.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-100 truncate">
              {member.name || truncateId(member.user_id)}
            </span>
            {isSelf && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">você</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={member.role} />
            {member.member_type && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                member.member_type === "mensalista"
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                {member.member_type === "mensalista" ? "Mensalista" : "Day Use"}
              </span>
            )}
            <span className="text-[10px] text-zinc-600">desde {formatDate(member.joined_at)}</span>
          </div>
        </div>
        {isAdmin && !isSelf && (
          <svg
            className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Ranking strip */}
      {showStats && (
        <div className="grid grid-cols-5 gap-px mx-4 mb-3">
          {[
            { label: "Nível", value: member.ranking.level, color: "text-green-400" },
            { label: "Pts",   value: member.ranking.points, color: "text-zinc-100" },
            { label: "V",     value: member.ranking.wins,   color: "text-zinc-100" },
            { label: "E",     value: member.ranking.draws,  color: "text-zinc-100" },
            { label: "D",     value: member.ranking.losses, color: "text-zinc-100" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-1.5 rounded-lg bg-zinc-800/50">
              <span className="text-[10px] text-zinc-600 uppercase">{label}</span>
              <span className={`text-sm font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && !isSelf && expanded && (
        <div className="border-t border-zinc-700 bg-zinc-900/60 animate-form-reveal">
          {/* Type row */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider w-8 shrink-0">Tipo</span>
            <div className="flex gap-1.5 flex-1">
              {(["mensalista", "diarista"] as MemberType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleSetType(t)}
                  disabled={updatingType}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold border transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                    member.member_type === t
                      ? t === "mensalista"
                        ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-zinc-800/60 text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {t === "mensalista" ? "Mensalista" : "Day Use"}
                </button>
              ))}
            </div>
            {updatingType && <Spinner />}
          </div>

          {/* Role + Remove row */}
          <div className="flex gap-1.5 px-3 pb-2.5">
            <button
              onClick={handleToggleRole}
              disabled={updatingRole}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold border transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                member.role === "admin"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                  : "bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600"
              }`}
            >
              {updatingRole ? <Spinner /> : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
              {member.role === "admin" ? "Remover Admin" : "Tornar Admin"}
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3.5 text-[11px] font-bold border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {removing ? <Spinner /> : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invite bar (embedded in hero) ───────────────────────────────────────────

interface InviteBarProps {
  groupId: string;
  isAdmin: boolean;
}

function InviteBar({ groupId, isAdmin }: InviteBarProps) {
  const { pushError } = useError();
  const { confirm } = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [exitingExpanded, setExitingExpanded] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [exitingNewForm, setExitingNewForm] = useState(false);
  const [maxUses, setMaxUses] = useState(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function collapseBar() {
    setExitingExpanded(true);
    setTimeout(() => { setExpanded(false); setExitingExpanded(false); }, 260);
  }

  function closeNewForm() {
    setExitingNewForm(true);
    setTimeout(() => { setShowNewForm(false); setExitingNewForm(false); }, 260);
  }

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`);
      if (!res.ok) return;
      const data = await res.json();
      const items: Invitation[] = Array.isArray(data) ? data : (data.items ?? data.invitations ?? data.data ?? []);
      setInvitations(items);
      setLoaded(true);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Load eagerly so the collapsed bar can show the link count
  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: maxUses }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao criar convite", type: "server_error" }));
        return;
      }
      const created = await res.json() as { token: string };
      setShowNewForm(false);
      setMaxUses(0);
      copyLink(created.token);
      await fetchInvitations();
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(inv: Invitation) {
    const ok = await confirm({
      title: "Revogar convite?",
      description: "Este link deixará de funcionar imediatamente. Quem ainda não entrou não conseguirá mais usar.",
      confirmLabel: "Revogar",
      variant: "danger",
    });
    if (!ok) return;
    const invitationId = inv.id;
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao revogar convite", type: "server_error" }));
        return;
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  }

  const active = invitations.filter((inv) => inv.status !== "revoked");
  const latest = active[0];

  return (
    <div className="border-t border-zinc-800/60">

      {/* ── Collapsed bar ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-zinc-800/30 active:bg-zinc-800/50 transition-colors group select-none"
        onClick={() => expanded ? collapseBar() : setExpanded(true)}
      >
        {/* Status dot + icon */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          {loaded && active.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-zinc-900" />
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-zinc-300">Convidar jogadores</span>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {loading ? "Carregando..." : active.length > 0
              ? `${active.length} link${active.length !== 1 ? "s" : ""} ativo${active.length !== 1 ? "s" : ""}`
              : "Nenhum link ativo"}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-all duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className={`px-4 pb-4 space-y-3 ${exitingExpanded ? "animate-form-hide" : "animate-form-reveal"}`}>

          {/* Empty state */}
          {active.length === 0 && !showNewForm && (
            isAdmin ? (
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent pointer-events-none" />
                <div className="relative flex flex-col items-center gap-3 py-8 px-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 blur-md" />
                    <div className="relative w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-100">Convide seus amigos!</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Crie um link e compartilhe com quem vai jogar</p>
                  </div>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-300 text-zinc-950 font-bold text-sm py-3 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Criar link de convite
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-xs text-zinc-600">Nenhum link de convite disponível.</p>
              </div>
            )
          )}

          {/* Active invite cards */}
          {active.map((inv) => (
            <div key={inv.id} className="relative rounded-2xl border border-zinc-700/60 bg-zinc-800/30 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/60 to-green-500/10" />

              {/* Token + meta */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs font-mono text-zinc-300 truncate">
                  /invite/<span className="text-green-400 font-bold">{inv.token.slice(0, 14)}</span>…
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-600">Expira {formatDate(inv.expires_at)}</span>
                  <span className="w-px h-2.5 bg-zinc-700" />
                  <span className={`text-[10px] font-semibold tabular-nums ${
                    inv.max_uses > 0 && inv.current_uses >= inv.max_uses ? "text-red-400" : "text-zinc-500"
                  }`}>
                    {inv.current_uses}{inv.max_uses > 0 ? `/${inv.max_uses}` : ""} uso{inv.current_uses !== 1 ? "s" : ""}
                  </span>
                  {inv.max_uses > 0 && (
                    <div className="flex-1 min-w-[40px] max-w-20 h-1 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500/60 transition-all"
                        style={{ width: `${Math.min(100, (inv.current_uses / inv.max_uses) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions — full width row */}
              <div className="flex border-t border-zinc-700/40">
                <button
                  onClick={() => copyLink(inv.token)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors ${
                    copiedToken === inv.token
                      ? "bg-green-500/20 text-green-400"
                      : "hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copiedToken === inv.token ? (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Copiado!</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Copiar link</>
                  )}
                </button>
                {isAdmin && (
                  <>
                    <div className="w-px bg-zinc-700/40" />
                    <button
                      onClick={() => handleRevoke(inv)}
                      className="px-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Revogar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Revogar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* New link form */}
          {isAdmin && showNewForm && (
            <div className={`rounded-2xl border border-zinc-700/60 bg-zinc-800/20 p-4 space-y-3 ${exitingNewForm ? "animate-form-hide" : "animate-form-reveal"}`}>
              <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Novo link</p>
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Máx. usos <span className="text-zinc-700">(0 = ilimitado)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(0, Number(e.target.value)))}
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-300 disabled:bg-green-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <><Spinner /> Criando...</> : "Criar e copiar"}
                </button>
                <button
                  onClick={closeNewForm}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium text-sm px-4 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Add new link button (when links exist) */}
          {isAdmin && !showNewForm && active.length > 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 hover:border-green-500/40 hover:bg-green-500/5 active:bg-green-500/10 py-3 text-xs font-bold text-zinc-600 hover:text-green-400 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Criar novo link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface GroupDetailProps {
  groupId: string;
}

export default function GroupDetail({ groupId }: GroupDetailProps) {
  const { pushError } = useError();
  const { confirm } = useConfirm();
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grupo" | "membros" | "partidas">("grupo");
  const [editingInfo, setEditingInfo] = useState(false);
  const [exitingInfo, setExitingInfo] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [exitingSettings, setExitingSettings] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [exitingLocation, setExitingLocation] = useState(false);
  const [preGames, setPreGames] = useState<PreGameItem[]>([]);
  const [loadingPreGames, setLoadingPreGames] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [exitingSchedule, setExitingSchedule] = useState(false);
  const [archiving, setArchiving] = useState(false);

  function cancelInfo() {
    setExitingInfo(true);
    setTimeout(() => { setEditingInfo(false); setExitingInfo(false); }, 260);
  }

  function cancelSettings() {
    setExitingSettings(true);
    setTimeout(() => { setEditingSettings(false); setExitingSettings(false); }, 260);
  }

  function cancelLocation() {
    setExitingLocation(true);
    setTimeout(() => { setEditingLocation(false); setExitingLocation(false); }, 260);
  }

  function cancelSchedule() {
    setExitingSchedule(true);
    setTimeout(() => { setEditingSchedule(false); setExitingSchedule(false); }, 260);
  }

  async function handleDeleteLocation(locationId: string) {
    try {
      const res = await fetch(`/api/groups/${group!.id}/locations/${locationId}`, { method: "DELETE" });
      if (!res.ok) { pushError(await parseBackendError(res, { title: "Erro ao remover local", type: "server_error" })); return; }
      setGroup((prev) => prev ? { ...prev, settings: { ...prev.settings, locations: prev.settings.locations?.filter((l) => l.id !== locationId) } } : prev);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    }
  }

  async function handleDeleteLocationWithConfirm(locationId: string) {
    const ok = await confirm({
      title: "Remover local?",
      description: "Este local será removido do grupo.",
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    await handleDeleteLocation(locationId);
  }

  async function handleSetPreferredLocation(locationId: string) {
    try {
      const res = await fetch(`/api/groups/${group!.id}/locations/${locationId}/preferred`, { method: "POST" });
      if (!res.ok) { pushError(await parseBackendError(res, { title: "Erro ao definir local preferido", type: "server_error" })); return; }
      setGroup((prev) => prev ? { ...prev, settings: { ...prev.settings, locations: prev.settings.locations?.map((l) => ({ ...l, is_preferred: l.id === locationId })) } } : prev);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    }
  }
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"all" | "mensalista" | "diarista">("all");
  const [showMemberStats, setShowMemberStats] = useState(true);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        const err = await parseBackendError(res, { title: "Erro ao carregar grupo", type: "server_error" });
        setFetchError(err.message);
        return null;
      }
      return normalizeGroupPayload(await res.json());
    } catch {
      setFetchError("Não foi possível conectar ao servidor.");
      return null;
    }
  }, [groupId]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return null;
      return await res.json() as CurrentUser;
    } catch {
      return null;
    }
  }, []);

  const fetchLocations = useCallback(async (): Promise<EventLocation[]> => {
    try {
      const res = await fetch(`/api/groups/${groupId}/locations`);
      if (!res.ok) return [];
      const data = await res.json() as { locations?: EventLocation[] };
      return data.locations ?? [];
    } catch {
      return [];
    }
  }, [groupId]);

  const fetchPreGames = useCallback(async (): Promise<PreGameItem[]> => {
    setLoadingPreGames(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/pregames`);
      if (!res.ok) return [];
      const data = await res.json() as { items?: PreGameItem[] };
      return data.items || [];
    } catch {
      return [];
    } finally {
      setLoadingPreGames(false);
    }
  }, [groupId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(null);
      const [groupData, userData, locations, preGamesData] = await Promise.all([
        fetchGroup(),
        fetchUser(),
        fetchLocations(),
        fetchPreGames(),
      ]);
      if (groupData) {
        if (locations.length > 0) groupData.settings.locations = locations;
        setGroup(groupData);
      }
      if (userData) setCurrentUser(userData);
      if (preGamesData) setPreGames(preGamesData);
      setLoading(false);
    }
    load();
  }, [fetchGroup, fetchUser, fetchLocations, fetchPreGames]);

  async function refreshGroup() {
    const updated = await fetchGroup();
    if (updated) setGroup(updated);
  }

  const currentUserMember = group && currentUser
    ? group.members.find((m) => m.user_id === currentUser.id)
    : undefined;

  const isAdmin = !!(
    group && currentUser &&
    (group.owner?.user_id === currentUser.id ||
      group.owner_id === currentUser.id ||
      currentUserMember?.role === "admin")
  );

  const isActiveMember = !!(currentUserMember?.status === "active") || isAdmin;

  async function handleArchive() {
    const ok = await confirm({
      title: "Arquivar grupo?",
      description: "O grupo ficará inativo. Todos os dados serão preservados e você poderá reativá-lo depois.",
      confirmLabel: "Arquivar",
      variant: "warning",
      iconPath: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
    });
    if (!ok) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/archive`, { method: "POST" });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao arquivar grupo", type: "server_error" }));
        return;
      }
      setGroup((prev) => prev ? { ...prev, status: "archived" } : prev);
    } catch {
      pushError({ title: "Erro de Conexão", type: "network_error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setArchiving(false);
    }
  }

  function handleMemberRemoved(memberId: string) {
    setGroup((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev);
  }

  function handleMemberUpdated(memberId: string, patch: Partial<Member>) {
    setGroup((prev) => prev ? {
      ...prev,
      members: prev.members.map((m) => m.id === memberId ? { ...m, ...patch } : m),
    } : prev);
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando grupo...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (fetchError || !group) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link href="/grupos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/dashboard" className="font-black text-lg tracking-tight">vamo<span className="text-green-400">jogar</span></Link>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-bold text-zinc-200">Erro ao carregar grupo</p>
            <p className="text-zinc-500 text-sm max-w-xs">{fetchError ?? "Grupo não encontrado."}</p>
            <Link href="/grupos" className="mt-2 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">
              ← Voltar para grupos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/grupos" className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/dashboard" className="font-black text-lg tracking-tight shrink-0">vamo<span className="text-green-400">jogar</span></Link>
          <span className="w-px h-4 bg-zinc-700 shrink-0" />
          <span className="text-sm font-semibold text-zinc-400 truncate flex-1 min-w-0">{group.name}</span>
          {isAdmin && group.status !== "archived" && (
            <button
              onClick={() => editingInfo ? cancelInfo() : setEditingInfo(true)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                editingInfo
                  ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              {editingInfo ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </>
              )}
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        <PendingInvites />

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div className={`relative rounded-2xl border bg-zinc-900/40 overflow-hidden transition-colors duration-300 ${editingInfo ? "border-green-500/40" : "border-zinc-800"}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />
          {editingInfo ? (
            <div className="animate-accent-sweep absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/70 to-transparent" />
          ) : (
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          )}

          {editingInfo ? (
            <div className={`p-6 pt-5 ${exitingInfo ? "animate-form-hide" : "animate-form-reveal"}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold tracking-widest text-green-400 uppercase">Editar grupo</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Informações e modalidade</p>
                </div>
                <button
                  onClick={cancelInfo}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <InfoEditForm
                groupId={group.id}
                initial={{ name: group.name, description: group.description, settings: group.settings }}
                onSave={(updated) => { setGroup(updated); setEditingInfo(false); }}
                onCancel={cancelInfo}
              />
              {group.status !== "archived" && (
                <div className="mt-6 pt-5 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Zona de perigo</p>
                      <p className="text-xs text-zinc-600 mt-0.5">Esta ação não pode ser desfeita</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={archiving}
                      className="rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold text-sm px-4 py-2 transition-colors disabled:opacity-50 border border-red-500/20 flex items-center gap-2"
                    >
                      {archiving ? (
                        <><Spinner /> Arquivando...</>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v6m4-6v6" />
                          </svg>
                          Arquivar grupo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab !== "grupo" ? (
            /* ── Minimized header (outras abas) ── */
            <div className="px-5 py-3.5 flex items-center gap-3 animate-tab-in">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-black text-zinc-100 truncate">{group.name}</h1>
                  <StatusBadge status={group.status} />
                </div>
                {group.settings.sport && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      ⚽ Futebol
                    </span>
                    {group.settings.football_config?.field_type && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {FIELD_TYPE_LABELS[group.settings.football_config.field_type]}
                      </span>
                    )}
                    {group.settings.football_config?.team_size && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 tabular-nums">
                        {group.settings.football_config.team_size}v{group.settings.football_config.team_size}
                      </span>
                    )}
                    {group.settings.football_config?.intensity && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${INTENSITY_COLORS[group.settings.football_config.intensity]}`}>
                        {INTENSITY_LABELS[group.settings.football_config.intensity]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Full hero (aba grupo) ── */
            <div className="p-6">
              {/* Título + status */}
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-zinc-100 truncate">{group.name}</h1>
                  <StatusBadge status={group.status} />
                </div>
                {group.description && (
                  <p className="text-zinc-400 text-sm mt-2 whitespace-pre-wrap leading-relaxed">{group.description}</p>
                )}
                {/* Modalidade badges */}
                {group.settings.sport && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      ⚽ Futebol
                    </span>
                    {group.settings.football_config?.field_type && (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {FIELD_TYPE_LABELS[group.settings.football_config.field_type]}
                      </span>
                    )}
                    {group.settings.football_config?.team_size && (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 tabular-nums">
                        {group.settings.football_config.team_size}v{group.settings.football_config.team_size}
                      </span>
                    )}
                    {group.settings.football_config?.intensity && (
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${INTENSITY_COLORS[group.settings.football_config.intensity]}`}>
                        {INTENSITY_LABELS[group.settings.football_config.intensity]}
                      </span>
                    )}
                    {group.settings.pre_game?.reminder_minutes && group.settings.pre_game.reminder_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {group.settings.pre_game.reminder_minutes >= 60
                          ? `${group.settings.pre_game.reminder_minutes / 60}h antes`
                          : `${group.settings.pre_game.reminder_minutes}min antes`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-zinc-800/60">
                {group.owner ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
                      {group.owner.picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={group.owner.picture_url} alt={group.owner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[9px] font-bold text-zinc-400">
                          {group.owner.name?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">{group.owner.name || truncateId(group.owner.user_id)}</span>
                  </div>
                ) : group.owner_id ? (
                  <span className="text-xs text-zinc-400">
                    Dono: <span className="font-mono text-zinc-500">{truncateId(group.owner_id)}</span>
                  </span>
                ) : null}
                <span className="w-px h-3 bg-zinc-700" />
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{group.members.length} membro{group.members.length !== 1 ? "s" : ""}</span>
                </div>
                {group.settings.max_members > 0 && (
                  <>
                    <span className="w-px h-3 bg-zinc-700" />
                    <span className="text-xs text-zinc-500">máx. {group.settings.max_members}</span>
                  </>
                )}
                <span className="w-px h-3 bg-zinc-700" />
                <span className="text-xs text-zinc-600">{formatDate(group.created_at)}</span>
                {isAdmin && (
                  <>
                    <span className="w-px h-3 bg-zinc-700" />
                    {editingSettings ? (
                      <div className={exitingSettings ? "animate-form-hide" : "animate-form-reveal"}>
                        <CapacityEditForm
                          groupId={group.id}
                          initial={group.settings}
                          onSave={(updated) => { setGroup(updated); setEditingSettings(false); }}
                          onCancel={cancelSettings}
                        />
                      </div>
                    ) : (
                      <button onClick={() => setEditingSettings(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2">
                        {group.settings.max_members === 0 ? "Sem limite de membros" : `Limite: ${group.settings.max_members}`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {/* ── Invite bar (always visible, collapsed by default) ──────── */}
          {!editingInfo && isActiveMember && group.status !== "archived" && (
            <InviteBar groupId={group.id} isAdmin={isAdmin} />
          )}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────── */}

        {/* TAB: Grupo */}
        {activeTab === "grupo" && (
        <div key="tab-grupo" className="animate-tab-in space-y-4">

        {/* ── Countdown ── */}
        {group.status !== "archived" && (
          <NextGameCountdown preGames={preGames} schedule={group.settings.schedule} />
        )}

        {/* ── Local + Agenda ── */}
        <div className={`grid gap-4 ${editingLocation || editingSchedule ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>

          {/* Local */}
          <div className={`relative rounded-2xl overflow-hidden border bg-zinc-900/40 p-5 transition-colors duration-300 ${editingLocation ? "border-violet-500/40" : "border-zinc-800"}`}>
            {/* Accent bar — sweeps in when editing */}
            {editingLocation && (
              <div className="animate-accent-sweep absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300 ${editingLocation ? "bg-violet-500/20" : "bg-violet-500/10"}`}>
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-zinc-300">Local</h2>
                {editingLocation && (
                  <span className="animate-form-reveal-d1 text-[10px] font-bold tracking-widest text-violet-400 uppercase">Novo</span>
                )}
              </div>
              {isAdmin && !editingLocation && (group.settings.locations ?? []).length > 0 && (
                <button onClick={() => setEditingLocation(true)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">
                  + Adicionar
                </button>
              )}
            </div>
            {editingLocation ? (
              <div className={exitingLocation ? "animate-form-hide" : "animate-form-reveal"}>
                <AddLocationForm
                  groupId={group.id}
                  onSave={(location) => {
                    setGroup((prev) => {
                      if (!prev) return prev;
                      const existing = prev.settings.locations ?? [];
                      const updated = location.is_preferred
                        ? [...existing.map((l) => ({ ...l, is_preferred: false })), location]
                        : [...existing, location];
                      return { ...prev, settings: { ...prev.settings, locations: updated } };
                    });
                    setEditingLocation(false);
                  }}
                  onCancel={cancelLocation}
                />
              </div>
            ) : (
              <LocationsDisplay
                locations={group.settings.locations ?? []}
                isAdmin={isAdmin}
                onDelete={handleDeleteLocationWithConfirm}
                onSetPreferred={handleSetPreferredLocation}
                onAdd={() => setEditingLocation(true)}
              />
            )}
          </div>

          {/* Agenda */}
          <div className={`relative rounded-2xl overflow-hidden border bg-zinc-900/40 p-5 transition-colors duration-300 ${editingSchedule ? "border-green-500/40" : "border-zinc-800"}`}>
            {/* Accent bar — sweeps in when editing */}
            {editingSchedule && (
              <div className="animate-accent-sweep absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/70 to-transparent" />
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300 ${editingSchedule ? "bg-green-500/20" : "bg-green-500/10"}`}>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-zinc-300">Agenda</h2>
                {editingSchedule && (
                  <span className="animate-form-reveal-d1 text-[10px] font-bold tracking-widest text-green-400 uppercase">Editar</span>
                )}
              </div>
              {isAdmin && !editingSchedule && (preGames.length > 0 || group.settings.schedule?.frequency) && (
                <div className="flex gap-3">
                  <button onClick={() => setEditingSchedule(true)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">
                    Editar agenda
                  </button>
                  {preGames.length > 0 && (
                    <button onClick={() => setActiveTab("partidas")} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">
                      Ver todas
                    </button>
                  )}
                </div>
              )}
            </div>
            {editingSchedule ? (
              <div className={exitingSchedule ? "animate-form-hide" : "animate-form-reveal"}>
                <ScheduleEditForm
                  groupId={group.id}
                  initial={group.settings}
                  onSave={(schedule) => { setGroup((prev) => prev ? { ...prev, settings: { ...prev.settings, schedule } } : prev); setEditingSchedule(false); }}
                  onCancel={cancelSchedule}
                />
              </div>
            ) : (
              <ScheduleDisplay
                preGames={preGames}
                settings={group.settings}
                isAdmin={isAdmin}
                onConfigure={() => setEditingSchedule(true)}
                onTabChange={(t) => setActiveTab(t)}
              />
            )}
          </div>

        </div>
        </div>
        )}

        {activeTab === "membros" && (
        <div key="tab-membros" className="animate-tab-in space-y-6">

          {/* Filter bar */}
          {group.members.length > 0 && (() => {
            const total       = group.members.length;
            const nMensalista = group.members.filter((m) => m.member_type === "mensalista").length;
            const nDiarista   = group.members.filter((m) => m.member_type === "diarista").length;

            const pills: { id: typeof memberTypeFilter; label: string; count: number; activeClass: string }[] = [
              { id: "all",        label: "Todos",       count: total,       activeClass: "bg-zinc-700 text-zinc-100 border-zinc-600" },
              { id: "mensalista", label: "Mensalistas", count: nMensalista, activeClass: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
              { id: "diarista",   label: "Day Use",     count: nDiarista,   activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
            ];

            return (
              <div className="space-y-3">
                {/* Pills — centradas */}
                <div className="flex justify-center gap-2">
                  {pills.map(({ id, label, count, activeClass }) => (
                    <button
                      key={id}
                      onClick={() => setMemberTypeFilter(id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all duration-150 active:scale-95 ${
                        memberTypeFilter === id
                          ? activeClass
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400"
                      }`}
                    >
                      {label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums transition-colors ${
                        memberTypeFilter === id ? "bg-black/20" : "bg-zinc-800 text-zinc-600"
                      }`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search + stats toggle */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar membro..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-colors"
                    />
                    {memberSearch && (
                      <button
                        onClick={() => setMemberSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-all duration-150 active:scale-90"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowMemberStats((v) => !v)}
                    title={showMemberStats ? "Ocultar estatísticas" : "Mostrar estatísticas"}
                    className={`shrink-0 self-center rounded-xl border w-10 h-10 flex items-center justify-center transition-all duration-150 active:scale-90 active:opacity-70 ${
                      showMemberStats
                        ? "bg-zinc-700 border-zinc-600 text-zinc-200 shadow-inner"
                        : "bg-zinc-800/60 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Empty state */}
          {group.members.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">Nenhum membro ainda</p>
            </div>
          ) : (() => {
            const bySearch = group.members.filter(
              (m) => !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase())
            );
            const byType = memberTypeFilter === "all"
              ? bySearch
              : bySearch.filter((m) => m.member_type === memberTypeFilter);

            const memberCardProps = (member: Member) => ({
              key: member.id,
              member,
              currentUserId: currentUser?.id ?? "",
              isAdmin,
              groupId: group.id,
              showStats: showMemberStats,
              onRemove: handleMemberRemoved,
              onUpdateMember: handleMemberUpdated,
            });

            if (byType.length === 0) {
              return (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center py-10 text-center gap-2">
                  <p className="text-zinc-600 text-sm">Nenhum resultado</p>
                  <button onClick={() => { setMemberSearch(""); setMemberTypeFilter("all"); }} className="text-xs text-zinc-600 hover:text-zinc-400 underline underline-offset-2 transition-colors">
                    Limpar filtros
                  </button>
                </div>
              );
            }

            if (memberTypeFilter !== "all") {
              return (
                <div className="space-y-2">
                  {byType.map((m) => {
                    const { key, ...props } = memberCardProps(m);
                    return <MemberCard key={key} {...props} />;
                  })}
                </div>
              );
            }

            const mensalistas = byType.filter((m) => m.member_type === "mensalista");
            const diaristas   = byType.filter((m) => m.member_type === "diarista");
            const semTipo     = byType.filter((m) => !m.member_type);

            const MemberGroup = ({ label, color, members }: { label: string; color: string; members: Member[] }) =>
              members.length === 0 ? null : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${color}`}>{label}</span>
                    <span className="rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px] font-semibold px-1.5 py-0.5">{members.length}</span>
                  </div>
                  <div className="space-y-2">
                    {members.map((m) => {
                      const { key, ...props } = memberCardProps(m);
                      return <MemberCard key={key} {...props} />;
                    })}
                  </div>
                </div>
              );

            return (
              <div className="space-y-6">
                <MemberGroup label="Mensalistas" color="text-violet-400" members={mensalistas} />
                <MemberGroup label="Day Use"     color="text-amber-400"  members={diaristas} />
                <MemberGroup label="Sem categoria" color="text-zinc-500" members={semTipo} />
              </div>
            );
          })()}

        </div>
        )}

        {/* TAB: Partidas */}
        {activeTab === "partidas" && (
        <div key="tab-partidas" className="animate-tab-in space-y-4">

          {/* Pre-games / confirmações */}
          {isActiveMember && group.status !== "archived" && (
            <PreGamesSection groupId={group.id} isAdmin={isAdmin} />
          )}

          {/* Próxima partida — confirmados */}
          <div className="relative rounded-2xl border border-green-500/20 bg-zinc-900/40 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-300">Confirmados — Próxima pelada</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Lista de presença para o próximo jogo</p>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-green-500/60 uppercase border border-green-500/20 rounded-full px-2.5 py-1">Em breve</span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6 border-t border-zinc-800/60">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center">
                    <svg className="w-4 h-4 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 max-w-[220px] leading-relaxed">
                Em breve os jogadores poderão confirmar presença e você verá a lista aqui.
              </p>
            </div>
          </div>


          {/* Histórico de partidas */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400">Histórico de partidas</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Resultados e estatísticas das últimas peladas</p>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase border border-zinc-800 rounded-full px-2.5 py-1">Em breve</span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
              <div className="flex gap-2 mb-1">
                {["V", "E", "D"].map((l, i) => (
                  <div key={l} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border ${
                    i === 0 ? "bg-green-500/10 border-green-500/20 text-green-500/60"
                    : i === 1 ? "bg-zinc-800 border-zinc-700 text-zinc-600"
                    : "bg-red-500/10 border-red-500/20 text-red-500/40"
                  }`}>{l}</div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 max-w-[220px] leading-relaxed">
                O histórico completo das partidas do grupo aparecerá aqui em breve.
              </p>
            </div>
          </div>

        </div>
        )}

        {/* ── Footer dock nav ─────────────────────────────────────────────── */}
        <div className="h-24" /> {/* spacer para não cobrir conteúdo */}

      </div>

      {/* Fixed footer dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center gap-1 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/60 rounded-2xl p-1.5 shadow-2xl shadow-black/40">
          {([
            {
              id: "grupo" as const,
              label: "Grupo",
              icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-colors ${active ? "text-green-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
            {
              id: "membros" as const,
              label: "Membros",
              icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-colors ${active ? "text-green-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
            {
              id: "partidas" as const,
              label: "Partidas",
              icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-colors ${active ? "text-green-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
          ] as const).map(({ id, label, icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all duration-200 ${
                  active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {active && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
                )}
                {icon(active)}
                <span className={`text-[10px] font-bold tracking-wide transition-colors ${active ? "text-zinc-300" : "text-zinc-600"}`}>
                  {label}
                </span>
                {id === "membros" && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-zinc-700 border border-zinc-600 text-[9px] font-bold text-zinc-300 flex items-center justify-center px-1">
                    {group.members.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
