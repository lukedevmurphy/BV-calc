"use client";

import type { CodingAssumptions } from "@/lib/types";
import { FieldLabel, NumberField, RangedField, Slider } from "./inputs";

/**
 * Editable inputs for the coding-efficiency driver. Embedded in the Settings
 * "Coding capacity allocation" section alongside the allocation slider. Reuses
 * the shared form primitives so it stays byte-consistent with the rest of the
 * assumptions panel.
 */
export default function CodingEditor({
  coding,
  onChange,
}: {
  coding: CodingAssumptions;
  onChange: (c: CodingAssumptions) => void;
}) {
  const set = (p: Partial<CodingAssumptions>) => onChange({ ...coding, ...p });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Engineers in scope"
          value={coding.coders}
          min={0}
          step={10}
          onChange={(coders) => set({ coders: Math.max(0, Math.round(coders)) })}
        />
        <div>
          <FieldLabel help="Share of an engineer's week spent writing or reviewing code (vs design, meetings, ops). The honest denominator for the efficiency gain.">
            Time on code ({Math.round(coding.timeOnCodePct * 100)}%)
          </FieldLabel>
          <div className="mt-1">
            <Slider
              value={coding.timeOnCodePct}
              min={0}
              max={1}
              step={0.05}
              onChange={(timeOnCodePct) => set({ timeOnCodePct })}
            />
          </div>
        </div>
      </div>

      <RangedField
        label="Coding efficiency gain (%)"
        value={coding.efficiencyGain}
        step={0.05}
        format="percent"
        help="Share of coding time freed by AI assistance. Even where AI writes most of the code, only a fraction of total engineer-time is freed — pressure-test against measured throughput before presenting."
        onChange={(efficiencyGain) => set({ efficiencyGain })}
      />

      <RangedField
        label="Engineering loaded cost ($/hr, geo-adjusted)"
        value={coding.engineeringLoadedCost}
        step={5}
        prefix="$"
        format="currency"
        help="Fully loaded engineer cost per hour, adjusted for the company's HQ region. Seeded from region on confirm; edit freely (e.g. for an offshore/onshore mix)."
        onChange={(engineeringLoadedCost) => set({ engineeringLoadedCost })}
      />

      <RangedField
        label="Baseline revenue (topline)"
        value={coding.topline}
        step={1_000_000}
        prefix="$"
        format="currency"
        help="Annual revenue the growth path lifts. Seeded from the company's revenue highlight."
        onChange={(topline) => set({ topline })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <RangedField
          label="Baseline revenue growth (%)"
          value={coding.growthBaseline}
          step={0.01}
          format="percent"
          help="Current annual topline growth rate. The revenue path steps this up by the factor at right (e.g. 10% → 12%)."
          onChange={(growthBaseline) => set({ growthBaseline })}
        />
        <NumberField
          label="Growth step-up × (1.2 = 10%→12%)"
          value={coding.growthStepUp}
          min={1}
          step={0.05}
          onChange={(growthStepUp) => set({ growthStepUp: Math.max(1, growthStepUp) })}
        />
      </div>
    </div>
  );
}
