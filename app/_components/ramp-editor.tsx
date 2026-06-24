"use client";

import type { RampPoint } from "@/lib/types";
import { EDGE_LABELS, FieldLabel, Slider } from "./inputs";
import { fmtPercent } from "@/lib/format";

interface Props {
  label: string;
  points: RampPoint[];
  onChange: (points: RampPoint[]) => void;
  /** "percent" renders 0..1 sliders as %, "multiplier" renders 0..4 as ×. */
  mode: "percent" | "multiplier";
}

const EDGES = ["low", "base", "high"] as const;

/**
 * Per-year low/base/high sliders for one ramp dimension (adoption breadth or
 * usage depth). Edits are clamped so low ≤ base ≤ high per year — the band
 * invariants of every downstream chart depend on it.
 */
export default function RampEditor({ label, points, onChange, mode }: Props) {
  const max = mode === "percent" ? 1 : 4;
  const step = mode === "percent" ? 0.01 : 0.05;
  const fmt = mode === "percent" ? fmtPercent : (n: number) => `${n.toFixed(2)}×`;

  const set = (yi: number, edge: (typeof EDGES)[number], n: number) => {
    const next = points.map((p, i) => {
      if (i !== yi) return p;
      const q = { ...p, [edge]: n };
      if (edge === "low") q.low = Math.min(n, p.base);
      if (edge === "high") q.high = Math.max(n, p.base);
      if (edge === "base") {
        q.low = Math.min(p.low, n);
        q.high = Math.max(p.high, n);
      }
      return q;
    });
    onChange(next);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2 space-y-3">
        {points.map((p, yi) => (
          <div key={p.year} className="rounded-md bg-muted p-2">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium">Year {p.year}</span>
              <span className="text-[11px] text-ink-tertiary">
                {fmt(p.low)} / {fmt(p.base)} / {fmt(p.high)}
              </span>
            </div>
            {EDGES.map((edge) => (
              <div key={edge} className="flex items-center gap-2">
                <span className="w-[4.75rem] shrink-0 text-[10px] text-ink-tertiary">
                  {EDGE_LABELS[edge]}
                </span>
                <Slider
                  value={p[edge]}
                  min={0}
                  max={max}
                  step={step}
                  onChange={(n) => set(yi, edge, n)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
