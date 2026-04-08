"use client";

import { useEffect, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Props = {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function TeamDrawNumericStepper({
  id,
  value,
  onChange,
  min = 2,
  max = 99,
  disabled = false,
}: Props) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const n = Number.parseInt(draft, 10);
    if (draft === "" || Number.isNaN(n)) {
      onChange(min);
      setDraft(String(min));
      return;
    }
    const c = clamp(n, min, max);
    onChange(c);
    setDraft(String(c));
  };

  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  return (
    <div className="mt-1 flex min-h-[44px] items-stretch overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 focus-within:ring-2 focus-within:ring-green-500/40">
      <button
        type="button"
        aria-label="Diminuir"
        disabled={!canDec}
        onClick={() => canDec && onChange(value - 1)}
        className="flex w-11 shrink-0 items-center justify-center border-r border-zinc-700 bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "");
          setDraft(t);
        }}
        onBlur={commitDraft}
        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-center text-sm font-semibold tabular-nums text-zinc-100 outline-none disabled:opacity-50"
      />
      <button
        type="button"
        aria-label="Aumentar"
        disabled={!canInc}
        onClick={() => canInc && onChange(value + 1)}
        className="flex w-11 shrink-0 items-center justify-center border-l border-zinc-700 bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
