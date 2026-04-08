"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useError, parseBackendError } from "@/contexts/ErrorContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  PreGame,
  PreGameParticipantsResponse,
  Participant,
  PreGameInvitation,
  ForceRemoveResponse,
  WhatsAppTextResponse,
  TeamDrawResponse,
} from "@/types/pregame";
import { AddGuestSheet } from "@/components/pregame/AddGuestSheet";
import { PregameTeamDrawSection } from "@/components/pregame/PregameTeamDrawSection";
import { parseTeamDrawPayload } from "@/components/pregame/team-draw/teamDrawHelpers";
import { mapTeamDrawError } from "@/lib/mapTeamDrawError";
import { canManagePregame, type GroupAclPayload } from "@/lib/pregameCanManage";

interface CurrentUser {
  id: string;
  name?: string;
  picture?: string;
}

interface Toast {
  message: string;
  key: number;
}

function isGuest(p: Participant) {
  return !!p.guest_name;
}

// ------------------------------------------------------------------
// Inline Toast
// ------------------------------------------------------------------
function ToastBar({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [toast.key, onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium px-5 py-3 rounded-xl shadow-2xl animate-fade-in-up">
        {toast.message}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Participant Avatar
// ------------------------------------------------------------------
function ParticipantAvatar({ p, size = "md" }: { p: Participant; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  if (!isGuest(p) && p.picture_url) {
    return <img src={p.picture_url} alt="" className={`${cls} rounded-full object-cover`} />;
  }
  const initials = (p.name || p.guest_name || "?").charAt(0).toUpperCase();
  const bg = isGuest(p) ? "bg-violet-500/20 text-violet-400" : "bg-zinc-700 text-zinc-300";
  return (
    <div className={`${cls} flex items-center justify-center rounded-full ${bg} font-bold`}>
      {initials}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export default function PreGameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: pregameId } = use(params);
  const router = useRouter();
  const { confirm } = useConfirm();
  const { pushError } = useError();
  const [pregame, setPregame] = useState<PreGame | null>(null);
  const [participants, setParticipants] = useState<PreGameParticipantsResponse | null>(null);
  const [invitations, setInvitations] = useState<PreGameInvitation[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [groupAcl, setGroupAcl] = useState<GroupAclPayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);
  const toastCounter = useRef(0);
  const showToast = useCallback((message: string) => {
    toastCounter.current += 1;
    setToast({ message, key: toastCounter.current });
  }, []);

  const [showAddGuestSheet, setShowAddGuestSheet] = useState(false);

  // Feature: Force Remove
  const [confirmRemove, setConfirmRemove] = useState<Participant | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Feature: WhatsApp
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppFallbackText, setWhatsAppFallbackText] = useState<string | null>(null);

  const [teamDraw, setTeamDraw] = useState<TeamDrawResponse | null>(null);
  const [teamDrawResolved, setTeamDrawResolved] = useState(false);
  // ------------------------------------------------------------------
  const fetchPregameData = useCallback(async () => {
    setTeamDrawResolved(false);
    try {
      const [pgRes, partRes, userRes, drawRes] = await Promise.all([
        fetch(`/api/pregames/${pregameId}`),
        fetch(`/api/pregames/${pregameId}/participants`),
        fetch("/api/users"),
        fetch(`/api/pregames/${pregameId}/team-draw`),
      ]);

      if (!pgRes.ok) {
        setFetchError("Erro ao carregar partida.");
        setTeamDraw(null);
        return;
      }

      const pgData = (await pgRes.json()) as PreGame;
      setPregame(pgData);

      const gRes = await fetch(`/api/groups/${pgData.group_id}`);
      if (gRes.ok) {
        setGroupAcl((await gRes.json()) as GroupAclPayload);
      } else {
        setGroupAcl(null);
      }

      if (partRes.ok) {
        const partData = (await partRes.json()) as PreGameParticipantsResponse;
        setParticipants(partData);
      }

      if (userRes.ok) {
        const userData = (await userRes.json()) as CurrentUser;
        setCurrentUser(userData);
      }

      if (drawRes.ok) {
        const raw = await drawRes.json();
        const parsed = parseTeamDrawPayload(raw);
        setTeamDraw(parsed);
      } else {
        const data = (await drawRes.json().catch(() => ({}))) as Record<string, unknown>;
        const mapped = mapTeamDrawError(drawRes.status, data, "get_draw");
        if (mapped.kind === "no_draw_yet") {
          setTeamDraw(null);
        } else {
          setTeamDraw(null);
        }
      }
    } catch {
      setFetchError("Erro de conexão ao carregar a partida.");
      setTeamDraw(null);
    } finally {
      setTeamDrawResolved(true);
      setLoading(false);
    }
  }, [pregameId]);

  useEffect(() => {
    fetchPregameData();
  }, [fetchPregameData]);

  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (!headerMenuOpen) return;
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocMouseDown);
    return () => document.removeEventListener("mousedown", handleDocMouseDown);
  }, [headerMenuOpen]);

  const loadInvitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/pregames/${pregameId}/invitations`);
      if (res.ok) {
        const data = (await res.json()) as { items: PreGameInvitation[] };
        setInvitations(data.items || []);
      }
    } catch {
      // ignore
    }
  }, [pregameId]);

  useEffect(() => {
    if (!pregame || !currentUser) return;
    if (canManagePregame(currentUser.id, pregame.created_by, groupAcl)) {
      loadInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pregame, currentUser, groupAcl]);

  // ------------------------------------------------------------------
  async function handleAction(
    endpoint: string,
    method: "POST" | "DELETE" | "PATCH" = "POST",
    title: string
  ) {
    if (processingAction) return;
    setProcessingAction(endpoint);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/${endpoint}`, { method });
      if (!res.ok) {
        // Priority window special case
        if (endpoint === "join" && res.status === 403) {
          const errData = await res.json().catch(() => ({})) as { code?: string };
          if (errData.code === "priority_window_active" && pregame?.members_priority_deadline) {
            const deadlineStr = format(
              new Date(pregame.members_priority_deadline),
              "dd/MM 'às' HH'h'mm",
              { locale: ptBR }
            );
            showToast(`⏳ Vagas reservadas para mensalistas até ${deadlineStr}. Tente novamente depois.`);
            return;
          }
        }
        pushError(await parseBackendError(res, { title, type: "server_error" }));
        return;
      }
      await fetchPregameData();
    } catch {
      pushError({
        title: "Erro de Conexão",
        type: "network_error",
        message: "Não foi possível conectar ao servidor.",
      });
    } finally {
      setProcessingAction(null);
    }
  }

  // ------------------------------------------------------------------
  async function generateInviteLink() {
    setProcessingAction("generate_invite");
    try {
      const res = await fetch(`/api/pregames/${pregameId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_uses: 0 }),
      });
      if (!res.ok) {
        pushError(await parseBackendError(res, { title: "Erro ao criar convite", type: "server_error" }));
        return;
      }
      const data = (await res.json()) as PreGameInvitation;
      const url = `${window.location.origin}/pregames/invite/${data.token}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copiado!");
      } catch {
        alert(`Link: ${url}`);
      }
      await loadInvitations();
    } catch {
      pushError({ title: "Erro", type: "error", message: "Falha ao gerar link." });
    } finally {
      setProcessingAction(null);
    }
  }

  /** Se já existir convite ativo, só copia; senão cria e copia. */
  async function copyOrCreateInviteLink() {
    const active = invitations.find((i) => i.status !== "revoked");
    if (active) {
      const url = `${window.location.origin}/pregames/invite/${active.token}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copiado!");
      } catch {
        alert(`Link: ${url}`);
      }
      return;
    }
    await generateInviteLink();
  }

  // ------------------------------------------------------------------
  // Feature 2: Force Remove
  // ------------------------------------------------------------------
  async function handleForceRemove(participant: Participant) {
    const participantId = participant.id;

    setRemovingId(participant.id);
    try {
      const res = await fetch(
        `/api/pregames/${pregameId}/participants/${participantId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        await res.json().catch(() => ({}));
        if (res.status === 403) {
          showToast("Apenas organizador ou admin do grupo pode remover");
        } else if (res.status === 404) {
          showToast("Participante não encontrado");
          setParticipants((prev) => prev ? removeParticipantFromState(prev, participant.id) : prev);
        } else if (res.status === 422) {
          showToast("Este participante não pode ser removido");
        } else {
          showToast("Erro ao remover participante");
        }
        return;
      }

      const data = (await res.json()) as ForceRemoveResponse;

      // Optimistic update: remove from local state immediately
      setParticipants((prev) => {
        if (!prev) return prev;
        let updated = removeParticipantFromState(prev, participant.id);

        if (data.promoted_participant_id) {
          const promoted = updated.waiting.find((p) => p.id === data.promoted_participant_id);
          if (promoted) {
            updated = {
              ...updated,
              waiting: updated.waiting.filter((p) => p.id !== data.promoted_participant_id),
              confirmed: [...updated.confirmed, { ...promoted, status: "confirmed" }],
            };
          }
        }
        return updated;
      });

      if (data.promoted_participant_id) {
        const promotedPart = participants?.waiting.find(
          (p) => p.id === data.promoted_participant_id
        );
        const promotedName = promotedPart?.name || "participante";
        showToast(`Vaga liberada — ${promotedName} promovido da lista de espera`);
      } else if (data.was_confirmed) {
        showToast("Participante removido");
      } else {
        showToast("Participante removido da lista");
      }

      setConfirmRemove(null);

      // Refetch to reconcile server state
      await fetchPregameData();
    } catch {
      showToast("Erro de conexão");
    } finally {
      setRemovingId(null);
    }
  }

  function removeParticipantFromState(
    prev: PreGameParticipantsResponse,
    participantId: string
  ): PreGameParticipantsResponse {
    return {
      ...prev,
      confirmed: prev.confirmed.filter((p) => p.id !== participantId),
      pending: prev.pending.filter((p) => p.id !== participantId),
      waiting: prev.waiting.filter((p) => p.id !== participantId),
      invited: prev.invited.filter((p) => p.id !== participantId),
      declined: prev.declined.filter((p) => p.id !== participantId),
    };
  }

  // ------------------------------------------------------------------
  // Feature 3: WhatsApp Text
  // ------------------------------------------------------------------
  async function handleCopyWhatsApp() {
    if (whatsAppLoading) return;
    setWhatsAppLoading(true);
    try {
      const res = await fetch(`/api/pregames/${pregameId}/whatsapp-text`);
      if (!res.ok) {
        if (res.status === 404) showToast("Jogo não encontrado");
        else showToast("Não foi possível gerar o texto");
        return;
      }
      const data = (await res.json()) as WhatsAppTextResponse;
      try {
        await navigator.clipboard.writeText(data.text);
        showToast("Texto copiado! Cole no WhatsApp 📋");
      } catch {
        setWhatsAppFallbackText(data.text);
      }
    } catch {
      showToast("Erro ao gerar texto. Tente novamente.");
    } finally {
      setWhatsAppLoading(false);
    }
  }

  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError || !pregame) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 gap-4">
        <p>{fetchError || "Partida não encontrada."}</p>
        <Link href="/dashboard" className="text-green-400 hover:text-green-300">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const canManage = canManagePregame(currentUser?.id, pregame.created_by, groupAcl);

  const hasConfirmedDraw =
    teamDraw != null && teamDraw.teams.length > 0 && teamDraw.is_confirmed;
  const hasDraftDraw =
    teamDraw != null && teamDraw.teams.length > 0 && !teamDraw.is_confirmed;
  const sorteioConfigHref = `/pregames/${pregameId}/sorteio/config?groupId=${encodeURIComponent(pregame.group_id)}`;
  const sorteioResultadoHref = `/pregames/${pregameId}/sorteio/resultado?groupId=${encodeURIComponent(pregame.group_id)}`;

  function handleSortear() {
    if (!teamDraw || teamDraw.teams.length === 0) {
      router.push(sorteioConfigHref);
      return;
    }
    if (!teamDraw.is_confirmed) {
      router.push(sorteioResultadoHref);
      return;
    }
    const sep = sorteioResultadoHref.includes("?") ? "&" : "?";
    router.push(`${sorteioResultadoHref}${sep}resort=1`);
  }

  // Priority window banner logic
  const showPriorityBanner =
    pregame.type === "standard" &&
    !!pregame.members_priority_deadline &&
    new Date() < new Date(pregame.members_priority_deadline);

  const priorityDeadlineStr = showPriorityBanner && pregame.members_priority_deadline
    ? format(new Date(pregame.members_priority_deadline), "dd/MM 'às' HH'h'mm", { locale: ptBR })
    : "";

  // Find current user status
  let myStatus: string | null = null;
  if (currentUser && participants) {
    const uid = currentUser.id;
    const match = (p: Participant) => !!p.user_id && p.user_id === uid;
    if (participants.confirmed.some(match)) myStatus = "confirmed";
    else if (participants.pending.some(match)) myStatus = "pending";
    else if (participants.waiting.some(match)) myStatus = "waiting";
    else if (participants.invited.some(match)) myStatus = "invited";
    else if (participants.declined.some(match)) myStatus = "declined";
  }

  const formattedDate = pregame.match_date
    ? format(new Date(pregame.match_date), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : "";
  const formattedTime = pregame.starts_at
    ? format(new Date(pregame.starts_at), "HH:mm")
    : "";

  const confirmedCount = participants?.confirmed.length || 0;
  const isFull = confirmedCount >= pregame.max_players;
  const joinText = isFull && pregame.allow_waiting_list
    ? "Entrar na Lista de Espera"
    : "Entrar na partida";

  // Formatting Pricing
  const isStandard = pregame.type === "standard";
  const mPrice = pregame.members_price || 0;
  const gPrice = pregame.guest_price || 0;
  const fPrice = pregame.flat_price || 0;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const pricingText = isStandard
    ? `Mensalistas: ${mPrice === 0 ? "Grátis" : formatBRL(mPrice)} • Convidados: ${gPrice === 0 ? "Grátis" : formatBRL(gPrice)}`
    : `Valor Único: ${fPrice === 0 ? "Grátis" : formatBRL(fPrice)}`;

  // ------------------------------------------------------------------
  // Participant Row renderer
  // ------------------------------------------------------------------
  function renderParticipantRow(
    p: Participant,
    index: number,
    variant: "confirmed" | "pending" | "waiting" | "invited"
  ) {
    const isWaiting = variant === "waiting";
    const isConfirmed = variant === "confirmed";
    const displayName =
      p.name ||
      p.guest_name ||
      (isGuest(p) ? "Convidado" : p.user_id ? `${p.user_id.slice(0, 8)}…` : "Participante");

    return (
      <div
        key={p.id}
        className={`flex items-center gap-3 rounded-xl border p-3 ${
          variant === "pending"
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-zinc-800 bg-zinc-900/40"
        } ${isWaiting ? "opacity-70" : ""}`}
      >
        {(isConfirmed || isWaiting) && (
          <div
            className={`w-6 h-6 ${isWaiting ? "rounded" : "rounded-full"} bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs font-bold flex-shrink-0`}
          >
            {isWaiting ? `${index + 1}º` : index + 1}
          </div>
        )}
        <ParticipantAvatar p={p} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-200 truncate">{displayName}</span>
          {isGuest(p) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 flex-shrink-0">
              convidado
            </span>
          )}
        </div>
        {canManage && variant !== "invited" && (
          <button
            onClick={() => setConfirmRemove(p)}
            disabled={removingId === p.id}
            title={`Remover ${displayName}`}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
          >
            {removingId === p.id ? (
              <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
        {canManage && variant === "pending" && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => handleAction(`participants/${p.id}/reject`, "PATCH", "Erro ao rejeitar")}
              className="w-7 h-7 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => handleAction(`participants/${p.id}/approve`, "PATCH", "Erro ao aprovar")}
              className="w-7 h-7 flex items-center justify-center rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100 pb-20">
      {/* Toast */}
      {toast && <ToastBar toast={toast} onDone={() => setToast(null)} />}

      {/* Nav */}
      <nav className="sticky top-0 z-40 w-full min-w-0 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-4xl mx-auto w-full min-w-0 px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href={`/grupos/${pregame.group_id}`}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-black text-lg tracking-tight">
            vamo<span className="text-green-400">jogar</span>
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto w-full min-w-0 px-4 sm:px-6 py-8 space-y-6">
        {/* Priority Window Banner */}
        {showPriorityBanner && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="text-lg">⏳</span>
            <span>
              Vagas reservadas para mensalistas até{" "}
              <strong className="text-amber-200">{priorityDeadlineStr}</strong>
            </span>
          </div>
        )}

        {/* Header — cartão principal (info + confirmados + ações de organizador) */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-500/5 blur-3xl sm:-right-20 sm:-top-20 sm:h-64 sm:w-64"
            aria-hidden
          />

          <div className="relative flex min-w-0 flex-col gap-6">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <h1 className="min-w-0 break-words text-2xl sm:text-3xl font-black text-zinc-100">
                    {pregame.name}
                  </h1>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      pregame.status === "open"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {pregame.status}
                  </span>
                </div>
                {canManage && (
                  <div className="relative shrink-0" ref={headerMenuRef}>
                    <button
                      type="button"
                      onClick={() => setHeaderMenuOpen((o) => !o)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      aria-expanded={headerMenuOpen}
                      aria-haspopup="true"
                      aria-label="Mais opções"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                    {headerMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
                        role="menu"
                      >
                        <Link
                          href={`/pregames/${pregame.id}/editar`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
                          onClick={() => setHeaderMenuOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Editar
                        </Link>
                        {myStatus === "confirmed" && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setHeaderMenuOpen(false);
                              void handleAction("leave", "DELETE", "Erro ao sair");
                            }}
                            disabled={!!processingAction}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 text-left disabled:opacity-50"
                          >
                            Sair da partida
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-zinc-400 mt-4">
                <div className="flex min-w-0 items-center gap-2 font-medium text-zinc-300">
                  <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="capitalize">
                    {formattedDate} às {formattedTime}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="min-w-0 break-words">
                    {pregame.location_name}{pregame.location_details ? ` (${pregame.location_details})` : ""}
                  </span>
                </div>
              </div>

              {/* Extra Info Row (Format & Costs) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-zinc-400 mt-3 pt-3 border-t border-zinc-800/60">
                {pregame.team_format && (
                  <div className="flex items-center gap-2 font-medium text-zinc-300">
                    <span className="text-base leading-none">⚽</span>
                    <span>Formato: {pregame.team_format}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-zinc-300 font-medium">
                  <span className="text-base leading-none">💰</span>
                  <span>{pricingText}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                  <span className="text-sm font-semibold text-zinc-400">Confirmados</span>
                  <span className="text-lg font-black text-green-400 tabular-nums">
                    {pregame.participants_count ?? 0}/{pregame.max_players}
                  </span>
                  {myStatus === "confirmed" && (
                    <span className="inline-flex items-center gap-1.5 text-green-400 shrink-0">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-bold">Você está confirmado!</span>
                    </span>
                  )}
                </div>
                {!canManage && myStatus === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleAction("leave", "DELETE", "Erro ao sair")}
                    disabled={!!processingAction}
                    className="text-xs font-semibold text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    Sair da partida
                  </button>
                )}
              </div>
            </div>

            {/* Contextual User Actions */}
            <div className="pt-5 border-t border-zinc-800/60">
              {myStatus === "invited" && (
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-amber-400">Você foi convidado!</p>
                    <p className="text-xs text-amber-500/80">Confirme sua presença ou libere a vaga.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAction("decline-invite", "POST", "Erro ao recusar")}
                      disabled={!!processingAction}
                      className="flex-1 sm:flex-none rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-2"
                    >
                      Tô fora
                    </button>
                    <button
                      onClick={() => handleAction("accept-invite", "POST", "Erro ao confirmar")}
                      disabled={!!processingAction}
                      className="flex-1 sm:flex-none rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-6 py-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      Tô dentro
                    </button>
                  </div>
                </div>
              )}

              {(myStatus === null || myStatus === "declined") && pregame.status === "open" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">
                    {isFull && pregame.allow_waiting_list ? "Partida cheia. Vagas na espera." : "Você não está nesta partida."}
                  </span>
                  <button
                    onClick={() => handleAction("join", "POST", "Erro ao entrar")}
                    disabled={!!processingAction || (isFull && !pregame.allow_waiting_list)}
                    className={`rounded-lg font-bold px-6 py-2 transition-colors ${
                      isFull && !pregame.allow_waiting_list
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-400 text-zinc-950"
                    }`}
                  >
                    {isFull && !pregame.allow_waiting_list ? "Partida Lotada" : joinText}
                  </button>
                </div>
              )}

              {canManage && (
                <div className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-stretch sm:gap-3">
                  <div className="flex gap-2 items-stretch min-w-0 sm:max-w-[min(100%,13rem)] sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSortear()}
                      disabled={!!processingAction}
                      title={
                        hasDraftDraw
                          ? "Continuar sorteio (rascunho)"
                          : hasConfirmedDraw
                            ? "Sortear novamente"
                            : "Abrir sorteio"
                      }
                      className="flex-1 min-h-[40px] min-w-0 inline-flex items-center justify-center rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Sortear
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyOrCreateInviteLink()}
                      disabled={!!processingAction}
                      aria-label="Copiar link de convite"
                      title="Copiar link de convite"
                      className="shrink-0 w-11 min-h-[40px] inline-flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!hasConfirmedDraw}
                    title={
                      hasConfirmedDraw
                        ? undefined
                        : "Confirme o sorteio na tela de sorteio antes de começar a partida"
                    }
                    className={`w-full min-h-[48px] sm:flex-1 inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-bold sm:min-h-[44px] sm:px-5 sm:py-2.5 sm:text-sm min-w-0 transition-colors ${
                      hasConfirmedDraw
                        ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
                        : "bg-transparent border border-zinc-600 text-zinc-500 cursor-not-allowed"
                    }`}
                    onClick={() => {}}
                  >
                    Começar partida
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Participants Lists */}
        {participants && (
          <div className="space-y-6 pt-4">
            {/* Section header with actions */}
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="min-w-0 text-base font-bold text-zinc-200">Participantes</h2>
              <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowAddGuestSheet(true)}
                    className="min-h-[44px] rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium text-xs px-3 py-1.5 hover:bg-violet-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Convidado
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  disabled={whatsAppLoading}
                  className="min-h-[44px] rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 font-medium text-xs px-3 py-1.5 hover:bg-green-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {whatsAppLoading ? (
                    <span className="w-3.5 h-3.5 border border-green-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>📋</span>
                  )}
                  Copiar para WhatsApp
                </button>
              </div>
            </div>

            {/* Pendentes */}
            {participants.pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
                    Aguardando Aprovação
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                    {participants.pending.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participants.pending.map((p, i) => renderParticipantRow(p, i, "pending"))}
                </div>
              </section>
            )}

            <PregameTeamDrawSection draw={teamDraw} resolved={teamDrawResolved} />

            {/* Confirmados */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">
                  Confirmados
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
                  {participants.confirmed.length}
                </span>
              </div>
              {participants.confirmed.length === 0 ? (
                <p className="text-sm text-zinc-500">Ninguém confirmado ainda.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participants.confirmed.map((p, i) => renderParticipantRow(p, i, "confirmed"))}
                </div>
              )}
            </section>

            {/* Lista de Espera */}
            {participants.waiting.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">
                    Lista de Espera
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                    {participants.waiting.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participants.waiting.map((p, i) => renderParticipantRow(p, i, "waiting"))}
                </div>
              </section>
            )}

            {/* Ainda não responderam */}
            {participants.invited.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 mt-6 pt-6 border-t border-zinc-800/60">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    Ainda não responderam
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                    {participants.invited.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {participants.invited.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 bg-zinc-900/40"
                    >
                      {!isGuest(p) && p.picture_url && (
                        <img
                          src={p.picture_url}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover grayscale opacity-50"
                        />
                      )}
                      {p.name || (isGuest(p) ? p.guest_name : p.user_id ? `${p.user_id.slice(0, 8)}…` : "?")}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Force Remove Confirmation Dialog */}
      {/* ---------------------------------------------------------------- */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Remover participante?</h3>
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-200">
                {confirmRemove.name || confirmRemove.guest_name || "este participante"}
              </strong>{" "}
              será removido do jogo. Se houver alguém na lista de espera, a vaga será liberada automaticamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={!!removingId}
                className="flex-1 rounded-xl bg-zinc-800 text-zinc-300 font-medium py-2.5 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleForceRemove(confirmRemove)}
                disabled={!!removingId}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 text-white font-bold py-2.5 transition-colors flex items-center justify-center gap-2"
              >
                {removingId ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Remover"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* WhatsApp Clipboard Fallback Modal */}
      {/* ---------------------------------------------------------------- */}
      {canManage && (
        <AddGuestSheet
          open={showAddGuestSheet}
          onClose={() => setShowAddGuestSheet(false)}
          pregameId={pregameId}
          groupId={pregame.group_id}
          onSuccess={fetchPregameData}
          showToast={showToast}
        />
      )}

      {whatsAppFallbackText !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">
              📋 Copie o texto abaixo
            </h3>
            <p className="text-xs text-zinc-500">
              Não foi possível copiar automaticamente. Selecione e copie manualmente.
            </p>
            <textarea
              readOnly
              rows={10}
              value={whatsAppFallbackText}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <button
              onClick={() => setWhatsAppFallbackText(null)}
              className="w-full rounded-xl bg-zinc-800 text-zinc-300 font-medium py-2.5 hover:bg-zinc-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
