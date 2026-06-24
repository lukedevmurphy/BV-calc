"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Ranged } from "@/lib/types";

/** Shared form primitives for the assumptions panel and editors. */

/** One vocabulary across the whole app: the Ranged edges keep their internal
 *  keys (low/base/high) but ALWAYS display as conservative/base/optimistic —
 *  matching the section subheads, exports and speaker notes (the CFO-legible
 *  wording). */
export const EDGE_LABELS: Record<"low" | "base" | "high", string> = {
  low: "conservative",
  base: "base",
  high: "optimistic",
};

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group relative inline-block normal-case tracking-normal">
      <summary
        aria-label={label}
        className="ml-1 inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-line-strong bg-canvas text-[10px] font-bold text-ink-secondary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <div className="absolute left-0 top-6 z-40 w-64 rounded-lg border border-line-strong bg-ink p-3 text-left text-xs font-normal leading-relaxed text-surface shadow-lg">
        {children}
      </div>
    </details>
  );
}

export function FieldLabel({ children, help }: { children: React.ReactNode; help?: string }) {
  return (
    <div className="flex items-center text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
      <span>{children}</span>
      {help && <InfoTip label={`About ${String(children)}`}>{help}</InfoTip>}
    </div>
  );
}

/** Group an unsigned numeric string with thousands separators, preserving a
 *  single decimal portion while the user is mid-edit ("1234." → "1,234."). */
function groupThousands(raw: string): string {
  if (!raw) return "";
  const dot = raw.indexOf(".");
  if (dot === -1) return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const intPart = raw.slice(0, dot).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decPart = raw.slice(dot + 1).replace(/\./g, "");
  return `${intPart}.${decPart}`;
}

/** Count value-bearing chars (digits + decimal point). Commas are excluded, so
 *  this is a caret anchor that regrouping can't shift. */
export function countValueChars(s: string): number {
  let n = 0;
  for (const ch of s) if ((ch >= "0" && ch <= "9") || ch === ".") n++;
  return n;
}

/** The caret index in `formatted` sitting just after its `count`-th value char.
 *  Restores the caret post-regroup so it stays put relative to what was typed. */
export function caretAfterValueChars(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      if (++seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** Comma-grouped numeric input for $ amounts — large figures stay legible.
 *  Holds a local draft while focused, and after each live regroup it restores
 *  the caret to the same value-char offset it was typed at, so editing in the
 *  middle of a number never bounces the caret to the end. Renders the optional
 *  prefix + input only, so callers supply the flex wrapper. */
function CurrencyInput({
  value,
  onChange,
  ariaLabel,
  prefix,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel?: string;
  prefix?: string;
  className: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const formatted = Number.isFinite(value) ? groupThousands(String(value)) : "";
  const display = draft ?? formatted;

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !ref.current) return;
    const pos = caretAfterValueChars(display, pendingCaret.current);
    ref.current.setSelectionRange(pos, pos);
    pendingCaret.current = null;
  });

  return (
    <>
      {prefix && <span className="text-xs text-ink-tertiary">{prefix}</span>}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={display}
        onFocus={() => setDraft(formatted)}
        onChange={(e) => {
          const el = e.currentTarget;
          const caret = el.selectionStart ?? el.value.length;
          // Anchor the caret by how many value chars sit to its left, so the
          // regroup below can re-insert commas without moving it.
          pendingCaret.current = countValueChars(el.value.slice(0, caret));
          const raw = el.value.replace(/[^0-9.]/g, "");
          setDraft(groupThousands(raw));
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        onBlur={() => setDraft(null)}
        className={className}
      />
    </>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  prefix,
  format = "number",
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  format?: "number" | "currency";
}) {
  return (
    <label className="block">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="mt-1 flex items-center gap-1">
        {format === "currency" ? (
          <CurrencyInput
            value={value}
            onChange={(n) => onChange(Math.max(min, n))}
            ariaLabel={label}
            prefix={prefix}
            className="w-full rounded-md border border-line bg-surface px-2 py-1 text-sm"
          />
        ) : (
          <>
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
          </>
        )}
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
  format = "number",
  help,
}: {
  label: string;
  value: Ranged;
  onChange: (r: Ranged) => void;
  step?: number;
  prefix?: string;
  format?: "number" | "percent" | "currency";
  help?: string;
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

  // The "i" help lives on the field header only — the three scenario boxes
  // share the same meaning, so per-edge tips would just be noise.
  return (
    <div>
      <FieldLabel help={help}>{label}</FieldLabel>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {(["low", "base", "high"] as const).map((edge) => (
          <div key={edge}>
            <div className="text-[10px] text-ink-tertiary">{EDGE_LABELS[edge]}</div>
            <div className="flex items-center gap-1">
              {format === "currency" ? (
                <CurrencyInput
                  value={value[edge]}
                  onChange={(n) => set(edge, n)}
                  ariaLabel={`${label}, ${EDGE_LABELS[edge]}`}
                  prefix={prefix}
                  className="w-full rounded-md border border-line bg-surface px-1.5 py-1 text-sm"
                />
              ) : (
                <>
                  {prefix && <span className="text-xs text-ink-tertiary">{prefix}</span>}
                  <input
                    type="number"
                    aria-label={`${label}, ${EDGE_LABELS[edge]}${format === "percent" ? ", percent" : ""}`}
                    value={format === "percent" ? Number((value[edge] * 100).toFixed(4)) : value[edge]}
                    step={format === "percent" ? step * 100 : step}
                    min={0}
                    max={format === "percent" ? 100 : undefined}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      const normalized = Number.isFinite(n) ? n : 0;
                      set(edge, format === "percent" ? normalized / 100 : normalized);
                    }}
                    className="w-full rounded-md border border-line bg-surface px-1.5 py-1 text-sm"
                  />
                  {format === "percent" && <span className="text-xs font-medium text-ink-tertiary">%</span>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Segmented (pill) toggle over a small string union. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
            value === o.value
              ? "bg-surface text-ink shadow-card"
              : "text-ink-secondary hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
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
