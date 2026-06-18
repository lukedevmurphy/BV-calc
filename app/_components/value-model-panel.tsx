"use client";

import type { ValueApproach, ValueModelInputs } from "@/lib/types";
import {
  ACTIVE_INPUT_GROUPS,
  APPROACH_BAND_HALF_WIDTH_PCT,
} from "@/lib/value-model/constants";
import type { SubIndustry } from "@/lib/value-model/sub-industry";
import { FieldLabel, RangedField, SegmentedControl } from "./inputs";

interface Props {
  approach: ValueApproach;
  valueModel: ValueModelInputs;
  /** Resolved from the confirmed company — drives the top-down driver labels. */
  subIndustry: SubIndustry;
  onApproachChange: (a: ValueApproach) => void;
  onValueModelChange: (v: ValueModelInputs) => void;
}

/** Tiny help line under a driver field. */
function Help({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-ink-tertiary">{children}</p>;
}

const APPROACH_OPTIONS: { value: ValueApproach; label: string }[] = [
  { value: "top_down", label: "Top-down" },
  { value: "bottom_up", label: "Bottom-up" },
];

/** One-line explainer (next to the control) + the fuller version (help text /
 *  tooltip). The contrast to make explicit: top-down DERIVES drivers from
 *  revenue (quick, assumptive); bottom-up BUILDS UP to the top line from use
 *  cases (rigorous, defensible). */
const APPROACH_COPY: Record<
  ValueApproach,
  { short: string; long: string }
> = {
  top_down: {
    short: "Less work, more assumptive — derive the drivers from the top-line numbers.",
    long:
      "Start from the company's high-level numbers — revenue, margin, headcount, growth rate, " +
      "operating expense, and fully-loaded cost per employee — and apply benchmark uplift to back " +
      "INTO the value drivers. Faster and fewer inputs, but more assumptive: it infers the drivers " +
      "from the top line rather than building them up.",
  },
  bottom_up: {
    short: "More work, more credible — build each driver up from use cases and sum them.",
    long:
      "Calculate each value driver independently. Individual use cases contribute to value drivers, " +
      "and multiple use cases can roll up into a single driver. The total value is the sum of the " +
      "drivers, derived not assumed. More inputs and more effort, but more defensible to a skeptical CFO.",
  },
};

/**
 * The value-case altitude control. Swaps which input groups are shown (and
 * which calculation the business_value section runs); all groups stay in state
 * so toggling never loses work. The preview re-flows live, including the
 * confidence band, which narrows as the approach deepens.
 */
export default function ValueModelPanel({
  approach,
  valueModel: vm,
  subIndustry,
  onApproachChange,
  onValueModelChange,
}: Props) {
  const patch = (p: Partial<ValueModelInputs>) => onValueModelChange({ ...vm, ...p });
  const v = subIndustry.topDown;

  const groups = ACTIVE_INPUT_GROUPS[approach];
  const bandPct = Math.round(APPROACH_BAND_HALF_WIDTH_PCT[approach] * 100);
  const copy = APPROACH_COPY[approach];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Value approach</h2>
        <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
          Top-down derives the value drivers from revenue (quick, assumptive);
          bottom-up builds up to the top line from use cases (rigorous,
          defensible).
        </p>
      </div>

      <SegmentedControl
        value={approach}
        options={APPROACH_OPTIONS}
        onChange={onApproachChange}
      />

      {/* Short explainer for the active approach, with the full definition in a
          hover tooltip; both definitions live in the help disclosure below. */}
      <p
        className="text-[11px] leading-snug text-ink-secondary"
        title={copy.long}
      >
        <span className="font-medium">
          {approach === "top_down" ? "Top-down" : "Bottom-up"}:
        </span>{" "}
        {copy.short}
      </p>

      <p className="text-[11px] text-ink-tertiary">
        Confidence band at this altitude:{" "}
        <span className="font-medium text-ink-secondary">±{bandPct}%</span>
        {approach === "bottom_up"
          ? " — the tightest, because every figure traces to quantified knobs."
          : " — the widest, because the drivers are inferred from the top line."}
      </p>

      <details className="text-[11px] text-ink-tertiary">
        <summary className="cursor-pointer select-none font-medium">
          How the two approaches compare
        </summary>
        <p className="mt-2 leading-snug">
          <span className="font-medium text-ink-secondary">Top-down</span> (less
          work, more assumptive): {APPROACH_COPY.top_down.long}
        </p>
        <p className="mt-2 leading-snug">
          <span className="font-medium text-ink-secondary">Bottom-up</span> (more
          work, more credible): {APPROACH_COPY.bottom_up.long}
        </p>
      </details>

      {groups.includes("topline") && (
        <div className="space-y-3 border-t border-line pt-3">
          <FieldLabel>Value drivers — {subIndustry.label}</FieldLabel>
          <div className="space-y-1">
            <RangedField
              label={v.toplineLabel}
              value={vm.topline}
              step={1_000_000}
              prefix="$"
              onChange={(r) => patch({ topline: r })}
            />
            <Help>{v.toplineHelp}</Help>
          </div>
          <div className="space-y-1">
            <RangedField
              label={v.addressableLabel}
              value={vm.addressableShare}
              step={0.05}
              onChange={(r) => patch({ addressableShare: r })}
            />
            <Help>{v.addressableHelp}</Help>
          </div>
          <div className="space-y-1">
            <RangedField
              label={v.upliftLabel}
              value={vm.upliftPct}
              step={0.05}
              onChange={(r) => patch({ upliftPct: r })}
            />
            <Help>{v.upliftHelp}</Help>
          </div>
          <div className="space-y-1">
            <RangedField
              label={v.realizationLabel}
              value={vm.realizationFactor}
              step={0.05}
              onChange={(r) => patch({ realizationFactor: r })}
            />
            <Help>{v.realizationHelp}</Help>
          </div>
          <label className="block">
            <FieldLabel>Uplift source (citation)</FieldLabel>
            <input
              type="text"
              value={vm.upliftSource ?? ""}
              placeholder="uncited — user to verify"
              onChange={(e) => patch({ upliftSource: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      )}

      {groups.includes("useCase") && (
        <p className="border-t border-line pt-3 text-[11px] leading-snug text-ink-tertiary">
          Bottom-up reads the selected use cases and the scenario assumptions
          below — adjust hours saved, instances, adoption breadth and depth there.
        </p>
      )}
    </div>
  );
}
