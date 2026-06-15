"use client";

import type { ValueApproach, ValueModelInputs, ValuePool } from "@/lib/types";
import {
  ACTIVE_INPUT_GROUPS,
  APPROACH_BAND_HALF_WIDTH_PCT,
} from "@/lib/value-model/constants";
import { FieldLabel, RangedField, SegmentedControl } from "./inputs";

interface Props {
  approach: ValueApproach;
  valueModel: ValueModelInputs;
  onApproachChange: (a: ValueApproach) => void;
  onValueModelChange: (v: ValueModelInputs) => void;
}

const APPROACH_OPTIONS: { value: ValueApproach; label: string }[] = [
  { value: "top_down", label: "Top-down" },
  { value: "middle", label: "Middle" },
  { value: "bottom_up", label: "Bottom-up" },
];

/**
 * The value-case altitude control. Swaps which input groups are shown (and
 * which calculation the business_value section runs); all groups stay in state
 * so toggling never loses work. The preview re-flows live, including the
 * confidence band, which narrows as the approach deepens.
 */
export default function ValueModelPanel({
  approach,
  valueModel: vm,
  onApproachChange,
  onValueModelChange,
}: Props) {
  const patch = (p: Partial<ValueModelInputs>) => onValueModelChange({ ...vm, ...p });
  const patchPool = (id: string, p: Partial<ValuePool>) =>
    patch({
      valuePools: vm.valuePools.map((pool) =>
        pool.id === id ? { ...pool, ...p } : pool,
      ),
    });

  const groups = ACTIVE_INPUT_GROUPS[approach];
  const bandPct = Math.round(APPROACH_BAND_HALF_WIDTH_PCT[approach] * 100);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Value approach</h2>
        <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
          Bottom-up: more inputs, tighter confidence, more defensible. Top-down:
          fast, benchmark-cited, coarser.
        </p>
      </div>

      <SegmentedControl
        value={approach}
        options={APPROACH_OPTIONS}
        onChange={onApproachChange}
      />

      <p className="text-[11px] text-ink-tertiary">
        Confidence band at this altitude: <span className="font-medium text-ink-secondary">±{bandPct}%</span>
      </p>

      {groups.includes("topline") && (
        <div className="space-y-3 border-t border-line pt-3">
          <FieldLabel>Company top-line</FieldLabel>
          <RangedField
            label="Top-line figure"
            value={vm.topline}
            step={1_000_000}
            prefix="$"
            onChange={(r) => patch({ topline: r })}
          />
          <RangedField
            label="Addressable share (0–1)"
            value={vm.addressableShare}
            step={0.05}
            onChange={(r) => patch({ addressableShare: r })}
          />
          <RangedField
            label="Benchmark uplift (0–1)"
            value={vm.upliftPct}
            step={0.05}
            onChange={(r) => patch({ upliftPct: r })}
          />
          <RangedField
            label="Realization factor (0–1)"
            value={vm.realizationFactor}
            step={0.05}
            onChange={(r) => patch({ realizationFactor: r })}
          />
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

      {groups.includes("valuePool") && (
        <div className="space-y-4 border-t border-line pt-3">
          <FieldLabel>Value pools</FieldLabel>
          {vm.valuePools.map((pool) => (
            <div key={pool.id} className="space-y-2 rounded-lg bg-muted/60 p-2.5">
              <input
                type="text"
                value={pool.label}
                onChange={(e) => patchPool(pool.id, { label: e.target.value })}
                className="w-full rounded-md border border-line bg-surface px-2 py-1 text-sm font-medium"
              />
              <RangedField
                label="Pool size"
                value={pool.size}
                step={1_000_000}
                prefix="$"
                onChange={(r) => patchPool(pool.id, { size: r })}
              />
              <div className="grid grid-cols-2 gap-2">
                <RangedField
                  label="Uplift (0–1)"
                  value={pool.upliftPct}
                  step={0.05}
                  onChange={(r) => patchPool(pool.id, { upliftPct: r })}
                />
                <RangedField
                  label="Adoption (0–1)"
                  value={pool.adoption}
                  step={0.05}
                  onChange={(r) => patchPool(pool.id, { adoption: r })}
                />
              </div>
            </div>
          ))}
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
