"use client";

import { useEffect, useRef, useState } from "react";
import { useError, type AppError } from "@/contexts/ErrorContext";

const AUTO_DISMISS_MS = 6000;

/* ── SVG Icons ── */
function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconSlash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function IconServer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

function IconConflict() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconWifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3.5 h-3.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Type styling ── */
interface TypeStyle {
  colorClass: string;
  bgClass: string;
  borderClass: string;
  progressHex: string;
  label: string;
  icon: React.ReactNode;
}

function getTypeStyle(type: string): TypeStyle {
  const t = type.toLowerCase();

  if (t.includes("valid") || t.includes("bad_request") || t.includes("unprocessable"))
    return {
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-l-amber-500",
      progressHex: "#f59e0b",
      label: "Validação",
      icon: <IconWarning />,
    };

  if (t.includes("auth") || t.includes("unauthorized") || t.includes("unauthenticated"))
    return {
      colorClass: "text-red-400",
      bgClass: "bg-red-500/10",
      borderClass: "border-l-red-500",
      progressHex: "#ef4444",
      label: "Autenticação",
      icon: <IconLock />,
    };

  if (t.includes("not_found") || t.includes("404"))
    return {
      colorClass: "text-zinc-400",
      bgClass: "bg-zinc-500/10",
      borderClass: "border-l-zinc-500",
      progressHex: "#71717a",
      label: "Não Encontrado",
      icon: <IconSearch />,
    };

  if (t.includes("conflict") || t.includes("409"))
    return {
      colorClass: "text-violet-400",
      bgClass: "bg-violet-500/10",
      borderClass: "border-l-violet-500",
      progressHex: "#a78bfa",
      label: "Conflito",
      icon: <IconConflict />,
    };

  if (t.includes("forbidden") || t.includes("403"))
    return {
      colorClass: "text-orange-400",
      bgClass: "bg-orange-500/10",
      borderClass: "border-l-orange-500",
      progressHex: "#f97316",
      label: "Sem Permissão",
      icon: <IconSlash />,
    };

  if (t.includes("network") || t.includes("connection"))
    return {
      colorClass: "text-sky-400",
      bgClass: "bg-sky-500/10",
      borderClass: "border-l-sky-500",
      progressHex: "#38bdf8",
      label: "Conexão",
      icon: <IconWifi />,
    };

  // default: server error
  return {
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-l-red-500",
    progressHex: "#ef4444",
    label: "Servidor",
    icon: <IconServer />,
  };
}

/* ── Single Toast ── */
function Toast({ error, onDismiss }: { error: AppError; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = getTypeStyle(error.type);

  function dismiss() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDismiss, 350);
  }

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={[
        "relative w-80 rounded-xl border border-zinc-800/80",
        "bg-zinc-900 shadow-2xl shadow-black/70 overflow-hidden",
        style.bgClass,
        "border-l-4",
        style.borderClass,
        leaving ? "animate-toast-out" : "animate-toast-in",
      ].join(" ")}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] rounded-full"
        style={{
          backgroundColor: style.progressHex,
          animation: `toast-progress ${AUTO_DISMISS_MS}ms linear forwards`,
        }}
      />

      <div className="flex gap-3 p-4">
        {/* Icon */}
        <div className={`shrink-0 mt-0.5 animate-icon-shake ${style.colorClass}`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-5">
          <span
            className={[
              "inline-block text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1.5 py-0.5 rounded",
              style.colorClass,
              style.bgClass,
            ].join(" ")}
          >
            {style.label}
          </span>
          <p className="text-sm font-semibold text-zinc-100 leading-snug">{error.title}</p>
          {(!error.errors || Object.keys(error.errors).length === 0) && (
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{error.message}</p>
          )}

          {/* Validation field errors */}
          {error.errors && Object.keys(error.errors).length > 0 && (
            <ul className="mt-2.5 space-y-2 border-t border-zinc-700/60 pt-2.5">
              {Object.entries(error.errors).map(([field, messages]) => {
                const shortField = field.split(".").pop() ?? field;
                return (
                  <li key={field} className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${style.colorClass}`}>
                      {shortField.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zinc-400 leading-relaxed">{messages.join(", ")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
        aria-label="Fechar notificação"
      >
        <IconClose />
      </button>
    </div>
  );
}

/* ── Toast Stack ── */
export default function ErrorToastStack() {
  const { errors, dismissError } = useError();

  if (errors.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 items-end"
      role="region"
      aria-label="Notificações de erro"
      aria-live="assertive"
    >
      {errors.map((err) => (
        <Toast key={err.id} error={err} onDismiss={() => dismissError(err.id)} />
      ))}
    </div>
  );
}
