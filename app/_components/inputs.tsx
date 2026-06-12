"use client";

import type { Ranged } from "@/lib/types";

/** Shared form primitives for the assumptions panel and editors. */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
      {children}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  prefix,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
}) {
  return (
    <label className="block">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="mt-1 flex items-center gap-1">
        {prefix && <span className="text-xs text-ink-tertiary">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-full rounded-md border border-line bg-surface px-2 py-1 text-sm"
        />
      </div>
    </label>
  );
}

/**
 * Three-input editor for a Ranged figure. Edits are softly clamped so
 * low ≤ base ≤ high always holds (the engine's band invariants depend on it).
 */
export function RangedField({
  label,
  value,
  onChange,
  step = 1,
  prefix,
}: {
  label: string;
  value: Ranged;
  onChange: (r: Ranged) => void;
  step?: number;
  prefix?: string;
}) {
  const set = (edge: "low" | "base" | "high", n: number) => {
    const next = { ...value, [edge]: n };
    if (edge === "low") next.low = Math.min(n, value.base);
    if (edge === "high") next.high = Math.max(n, value.base);
    if (edge === "base") {
      next.low = Math.min(value.low, n);
      next.high = Math.max(value.high, n);
    }
    onChange(next);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {(["low", "base", "high"] as const).map((edge) => (
          <div key={edge}>
            <div className="text-[10px] text-ink-tertiary">{edge}</div>
            <div className="flex items-center gap-1">
              {prefix && <span className="text-xs text-ink-tertiary">{prefix}</span>}
              <input
                type="number"
                value={value[edge]}
                step={step}
                min={0}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  set(edge, Number.isFinite(n) ? n : 0);
                }}
                className="w-full rounded-md border border-line bg-surface px-1.5 py-1 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className="w-full accent-[var(--accent)]"
    />
  );
}
