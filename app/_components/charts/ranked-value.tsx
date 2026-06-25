"use client";

import type { RankedValue } from "@/lib/types";
import { fmtCurrency, fmtNumber } from "@/lib/format";

/**
 * Number-first "ranked value" exhibit — the web mirror of addRankedValue() in
 * lib/pptx/slide-builders.ts. Each row reads: quiet supporting chain on the
 * left, a share-scaled bar in the middle, and the dollar value right-anchored
 * in the largest type on the row. Rows arrive pre-sorted high→low and shares
 * are precomputed in the module, so web and pptx draw identical bars. Pure CSS
 * widths (no Recharts) — nothing to animate, SSR-safe.
 */
export default function RankedValueExhibit({ data }: { data: RankedValue }) {
  const fmt = data.format === "number" ? fmtNumber : fmtCurrency;
  const total = data.total.value || 1;

  return (
    <div>
      {data.rows.map((row, i) => {
        const barPct = Math.max(row.share * 100, 1.5);
        // Whisker (optional band) expressed on the same value/total scale.
        const whisker = row.range
          ? {
              left: (row.range.low / total) * 100,
              width: Math.max(((row.range.high - row.range.low) / total) * 100, 0.5),
            }
          : null;
        return (
          <div key={`${row.label}-${i}`} className="flex items-center gap-4 py-2">
            <div className="w-[32%] shrink-0 text-right">
              <div className="text-[13px] font-semibold leading-tight text-ink">{row.label}</div>
              {row.chain?.[0] && (
                <div className="text-[11px] leading-tight text-ink-tertiary">{row.chain[0]}</div>
              )}
            </div>
            <div className="relative flex-1 self-stretch">
              <div className="absolute inset-y-0 left-0 right-0 my-auto h-7 rounded-sm bg-muted" />
              <div
                className="absolute inset-y-0 left-0 my-auto h-7 rounded-r-sm bg-[var(--chart-value)]"
                style={{ width: `${barPct}%` }}
              />
              {whisker && (
                <div
                  className="absolute inset-y-0 my-auto h-px bg-ink-tertiary/60"
                  style={{ left: `${whisker.left}%`, width: `${whisker.width}%` }}
                />
              )}
            </div>
            <div className="w-[20%] shrink-0 text-right font-serif font-semibold tabular-nums text-accent text-[clamp(15px,1.6vw,22px)]">
              {fmt(row.value)}
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex justify-end border-t border-line-strong pt-2">
        <span className="font-serif text-sm text-ink-secondary">{data.total.label}</span>
      </div>
    </div>
  );
}
