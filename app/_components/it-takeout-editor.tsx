"use client";

import type { ItTakeoutAssumptions } from "@/lib/types";
import { FieldLabel, NumberField, RangedField } from "./inputs";

/**
 * Checkbox + sunset-schedule editor for the IT cost takeout / legacy application
 * rationalization driver. Available for any industry. The per-year fields adapt
 * to the analysis horizon; each is the CUMULATIVE annual run-rate eliminated by
 * that year. When enabled, the driver folds into the benefit + ROI.
 */
export default function ItTakeoutEditor({
  itTakeout,
  horizonYears,
  onChange,
}: {
  itTakeout: ItTakeoutAssumptions;
  horizonYears: number;
  onChange: (t: ItTakeoutAssumptions) => void;
}) {
  const t = itTakeout;
  const set = (p: Partial<ItTakeoutAssumptions>) => onChange({ ...t, ...p });
  const years = Array.from({ length: Math.max(1, horizonYears) }, (_, i) => i + 1);
  const setYear = (y: number, v: number) =>
    set({ sunsetByYear: { ...t.sunsetByYear, [String(y)]: Math.max(0, v) } });

  return (
    <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={t.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <h2 className="text-sm font-semibold">
          IT cost takeout / legacy application rationalization
        </h2>
      </label>
      <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
        Available for any industry. Decommission legacy applications and infrastructure on a sunset
        schedule — enter the cumulative annual run-rate cost eliminated by each year. It becomes a
        hard-dollar value driver that folds into the benefit and ROI.
      </p>

      {t.enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel help="Cumulative annual legacy IT cost eliminated by the END of each year (run-rate). A sunset stays done, so each year should be ≥ the prior. Leave early years at 0 if rationalization starts later.">
              Annual IT cost eliminated — cumulative by year
            </FieldLabel>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {years.map((y) => (
                <NumberField
                  key={y}
                  label={`By Year ${y}`}
                  value={t.sunsetByYear[String(y)] ?? 0}
                  step={100_000}
                  min={0}
                  prefix="$"
                  format="currency"
                  onChange={(v) => setYear(y, v)}
                />
              ))}
            </div>
          </div>
          <RangedField
            label="Takeout realization (%)"
            value={t.realization}
            step={0.05}
            format="percent"
            help="Share of the planned takeout actually realized — decommissioning carries execution risk (data migration, contract exits, stranded dependencies)."
            onChange={(realization) => set({ realization })}
          />
        </div>
      )}
    </section>
  );
}
