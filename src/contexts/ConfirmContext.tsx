"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmDetail {
  label: string;
  value: string;
  /** SVG path d= for the left icon inside the pill */
  iconPath?: string;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  iconPath?: string;
  /** Optional pill-style info field shown between description and actions */
  detail?: ConfirmDetail;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT: Record<ConfirmVariant, {
  defaultIcon: string;
  iconRing: string;
  iconColor: string;
  confirmCls: string;
}> = {
  danger: {
    defaultIcon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    iconRing:    "bg-red-500/10 ring-1 ring-red-500/20",
    iconColor:   "text-red-400",
    confirmCls:  "bg-red-500 hover:bg-red-400 text-white",
  },
  warning: {
    defaultIcon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    iconRing:    "bg-amber-500/10 ring-1 ring-amber-500/20",
    iconColor:   "text-amber-400",
    confirmCls:  "bg-amber-400 hover:bg-amber-300 text-zinc-950",
  },
  info: {
    defaultIcon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    iconRing:    "bg-green-500/10 ring-1 ring-green-500/20",
    iconColor:   "text-green-400",
    confirmCls:  "bg-green-500 hover:bg-green-400 text-zinc-950",
  },
};

const LINK_ICON = "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1";

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalState {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

function ConfirmModal({ state, onClose }: { state: ModalState; onClose: (v: boolean) => void }) {
  const { opts } = state;
  const v = VARIANT[opts.variant ?? "danger"];
  const iconPath = opts.iconPath ?? v.defaultIcon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") { e.preventDefault(); onClose(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />

      {/* Card */}
      <div className="relative mx-5 w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl p-6">

        {/* Icon — topo esquerdo, isolado */}
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${v.iconRing}`}>
          <svg
            className={`w-5 h-5 ${v.iconColor}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white leading-tight mt-3 mb-2">
          {opts.title}
        </h2>

        {/* Description */}
        {opts.description && (
          <p className="text-sm text-zinc-400 leading-relaxed mb-7">
            {opts.description}
          </p>
        )}

        {/* Detail pill — campo de exibição estilo input */}
        {opts.detail && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-zinc-500 mb-2">{opts.detail.label}</p>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={opts.detail.iconPath ?? LINK_ICON} />
                </svg>
              </div>
              <span className="text-sm font-mono text-zinc-300 truncate flex-1">
                {opts.detail.value}
              </span>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="h-px bg-zinc-800" style={{ marginTop: "2rem", marginBottom: "2rem" }} />

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onClose(false)}
            className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors focus:outline-none"
          >
            {opts.cancelLabel ?? "Cancelar"}
          </button>
          <button
            autoFocus
            onClick={() => onClose(true)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
              opts.variant === "warning" ? "bg-amber-400 hover:bg-amber-300 text-zinc-950" :
              opts.variant === "info" ? "bg-green-500 hover:bg-green-400 text-zinc-950" :
              "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            {opts.confirmLabel ?? "Confirmar"}
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center mt-4">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/80 font-mono text-zinc-400">Esc</kbd> cancela · <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/80 font-mono text-zinc-400">Enter</kbd> confirma
        </p>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ opts, resolve });
    });
  }, []);

  function handleClose(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setModal(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modal && <ConfirmModal state={modal} onClose={handleClose} />}
    </ConfirmContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
