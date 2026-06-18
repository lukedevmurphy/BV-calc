"use client";

import type { ScenarioAssumptions, UseCase } from "@/lib/types";
import { FieldLabel, NumberField, RangedField, Slider } from "./inputs";
import RampEditor from "./ramp-editor";
import ModelMixEditor from "./model-mix-editor";
import TokenModelEditor from "./token-model-editor";

interface Props {
  assumptions: ScenarioAssumptions;
  onChange: (a: ScenarioAssumptions) => void;
  /** Selected use cases — drives the per-use-case token editor. */
  selectedUseCases: UseCase[];
}

/**
 * The single user-controlled scenario object. Every edit flows through
 * onChange into builder state, and the section pipeline recomputes live —
 * Cost, Business Value, and Forecast re-flow together by construction.
 */
export default function AssumptionsPanel({ assumptions: a, onChange, selectedUseCases }: Props) {
  const patch = (p: Partial<ScenarioAssumptions>) => onChange({ ...a, ...p });
  const cachePct = Math.round((a.cacheHitRatio ?? 0) * 100);
  const batchPct = Math.round((a.batchShare ?? 0) * 100);

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold">Scenario assumptions</h2>

      <NumberField
        label="Target user count"
        value={a.targetUserCount}
        step={50}
        onChange={(n) => patch({ targetUserCount: n })}
      />

      <RampEditor
        label="Adoption breadth (% of target users active)"
        mode="percent"
        points={a.adoptionBreadth}
        onChange={(points) => patch({ adoptionBreadth: points })}
      />

      <RampEditor
        label="Usage depth (consumption multiplier per adopter)"
        mode="multiplier"
        points={a.usageDepth}
        onChange={(points) => patch({ usageDepth: points })}
      />

      {/* ── Cost model ──────────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-line pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Cost model
        </h3>

        <ModelMixEditor mix={a.modelMix} onChange={(modelMix) => patch({ modelMix })} />

        <div>
          <FieldLabel>Prompt-cache hit — {cachePct}% of input cached (~90% off)</FieldLabel>
          <Slider
            value={a.cacheHitRatio ?? 0}
            min={0}
            max={1}
            step={0.05}
            onChange={(cacheHitRatio) => patch({ cacheHitRatio })}
          />
        </div>
        <div>
          <FieldLabel>Batch API share — {batchPct}% of tasks (~50% off)</FieldLabel>
          <Slider
            value={a.batchShare ?? 0}
            min={0}
            max={1}
            step={0.05}
            onChange={(batchShare) => patch({ batchShare })}
          />
        </div>

        <TokenModelEditor
          assumptions={a}
          selectedUseCases={selectedUseCases}
          onChange={onChange}
        />
      </div>

      <RangedField
        label="Loaded hourly cost ($/hr)"
        value={a.loadedHourlyCost}
        step={5}
        prefix="$"
        onChange={(r) => patch({ loadedHourlyCost: r })}
      />

      <RangedField
        label="One-time implementation cost"
        value={a.implementationCost}
        step={25000}
        prefix="$"
        onChange={(r) => patch({ implementationCost: r })}
      />

      <NumberField
        label="Horizon (years)"
        value={a.horizonYears}
        step={1}
        min={1}
        onChange={(n) => patch({ horizonYears: Math.max(1, Math.min(5, Math.round(n))) })}
      />
    </div>
  );
}
