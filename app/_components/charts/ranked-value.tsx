"use client";

import type { ReactNode } from "react";
import type { RankedValue } from "@/lib/types";
import { fmtCurrency, fmtNumber } from "@/lib/format";

/**
 * Value-map table — the web mirror of addRankedValue() in
 * lib/pptx/slide-builders.ts. Each row reads left→right as a flow:
 *   STRATEGIC GOAL → USE CASES (capabilities) → VALUE DRIVER + the P&L line it
 *   impacts → the quantified ANNUAL VALUE, big and auburn, right-aligned.
 * A bold auburn total is pinned beneath, aligned under the value column. No
 * bars — the number is the point. Pure CSS grid, SSR-safe.
 */
const COLS = "grid grid-cols-[1.4fr_2.1fr_1.6fr_1.3fr] gap-x-4";

export default function RankedValueExhibit({ data }: { data: RankedValue }) {
  const fmt = data.format === "number" ? fmtNumber : fmtCurrency;

  return (
    <div>
      <div className={`${COLS} border-b border-line-strong pb-2`}>
        <Head>Strategic goal</Head>
        <Head>Use cases</Head>
        <Head>Value driver</Head>
        <Head className="text-right">Annual value</Head>
      </div>

      <div className="divide-y divide-line">
        {data.rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className={`${COLS} items-center py-3`}>
            <div className="text-[15px] font-semibold leading-snug text-ink">{row.label}</div>
            <div className="text-[12px] leading-snug text-ink-tertiary">{row.chain?.[0]}</div>
            <div>
              {row.valueNote && (
                <div className="text-[13px] font-medium leading-snug text-ink">{row.valueNote}</div>
              )}
              {row.impact && (
                <div className="text-[11px] leading-snug text-ink-tertiary">{row.impact}</div>
              )}
            </div>
            <div className="text-right font-serif text-[clamp(20px,2.3vw,30px)] font-bold leading-none tabular-nums text-accent">
              {fmt(row.value)}
            </div>
          </div>
        ))}
      </div>

      <div className={`${COLS} items-baseline border-t-2 border-line-strong pt-3`}>
        <div className="col-span-3 text-right text-sm font-semibold uppercase tracking-wide text-ink-secondary">
          {data.total.label}
        </div>
        <div className="text-right font-serif text-[clamp(22px,2.7vw,34px)] font-bold leading-none tabular-nums text-accent">
          {fmt(data.total.value)}
        </div>
      </div>
    </div>
  );
}

function Head({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary ${className}`}
    >
      {children}
    </div>
  );
}
