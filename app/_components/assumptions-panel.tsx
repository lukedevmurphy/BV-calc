"use client";

import type { ScenarioAssumptions } from "@/lib/types";
import { NumberField, RangedField } from "./inputs";
import RampEditor from "./ramp-editor";
import ModelMixEditor from "./model-mix-editor";

interface Props {
  assumptions: ScenarioAssumptions;
  onChange: (a: ScenarioAssumptions) => void;
}

/**
 * The single user-controlled scenario object. Every edit flows through
 * onChange into builder state, and the section pipeline recomputes live —
 * Cost, Business Value, and Forecast re-flow together by construction.
 */
export default function AssumptionsPanel({ assumptions: a, onChange }: Props) {
  const patch = (p: Partial<ScenarioAssumptions>) => onChange({ ...a, ...p });

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

      <RangedField
        label="Tasks per active user / month"
        value={a.avgTasksPerActiveUserPerMonth}
        step={5}
        onChange={(r) => patch({ avgTasksPerActiveUserPerMonth: r })}
      />

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Tokens / task (input)"
          value={a.avgTokensPerTask.input}
          step={1000}
          onChange={(n) =>
            patch({ avgTokensPerTask: { ...a.avgTokensPerTask, input: n } })
          }
        />
        <NumberField
          label="Tokens / task (output)"
          value={a.avgTokensPerTask.output}
          step={500}
          onChange={(n) =>
            patch({ avgTokensPerTask: { ...a.avgTokensPerTask, output: n } })
          }
        />
      </div>

      <ModelMixEditor mix={a.modelMix} onChange={(modelMix) => patch({ modelMix })} />

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
