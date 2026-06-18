"use client";

import type {
  CompanyProfile,
  ScenarioAssumptions,
  ValueApproach,
  ValueModelInputs,
} from "@/lib/types";
import type { SubIndustry } from "@/lib/value-model/sub-industry";
import { resolveUseCases } from "@/lib/data/use-cases";
import { isIllustrativeProfile } from "@/lib/provenance";
import UseCasePicker from "../use-case-picker";
import ValueModelPanel from "../value-model-panel";
import AssumptionsPanel from "../assumptions-panel";

interface Props {
  company: CompanyProfile;
  useCaseIds: string[];
  onUseCaseIds: (ids: string[]) => void;
  assumptions: ScenarioAssumptions;
  onAssumptions: (a: ScenarioAssumptions) => void;
  valueModel: ValueModelInputs;
  onValueModel: (v: ValueModelInputs) => void;
  subIndustry: SubIndustry;
  onNext: () => void;
}

/** Inputs screen — gather/edit the inputs, then proceed to Build. Ends with a
 *  completeness signal that reinforces the bottom-up credibility story. */
export default function InputsScreen({
  company,
  useCaseIds,
  onUseCaseIds,
  assumptions,
  onAssumptions,
  valueModel,
  onValueModel,
  subIndustry,
  onNext,
}: Props) {
  const approach = assumptions.valueApproach ?? "bottom_up";

  // Soft completeness signal (illustrative): company facts the user has
  // confirmed vs. the priors the system AI-estimated for them.
  const confirmed = [
    company.name,
    company.industry,
    company.employeeCount,
    company.revenueModel,
    company.financialHighlights?.length ? "f" : undefined,
  ].filter(Boolean).length;
  const aiEstimated = approach === "bottom_up" ? useCaseIds.length : 3;
  const illustrative = isIllustrativeProfile(company);
  const confidence =
    approach === "bottom_up"
      ? illustrative
        ? "medium"
        : "medium-high"
      : illustrative
        ? "medium-low"
        : "medium";

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Inputs</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Confirm the company, pick the use cases, choose how the value case is built, and
          set the scenario. Everything recomputes live.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-6 rounded-xl border border-line bg-surface p-5 shadow-card">
          <UseCasePicker
            selectedIds={useCaseIds}
            onChange={onUseCaseIds}
            initialIndustry={subIndustry.useCaseIndustry}
            rankedIds={subIndustry.rankedUseCaseIds}
          />
          <hr className="border-line" />
          <ValueModelPanel
            approach={approach}
            valueModel={valueModel}
            subIndustry={subIndustry}
            onApproachChange={(valueApproach: ValueApproach) =>
              onAssumptions({ ...assumptions, valueApproach })
            }
            onValueModelChange={onValueModel}
          />
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <AssumptionsPanel
            assumptions={assumptions}
            onChange={onAssumptions}
            selectedUseCases={resolveUseCases(useCaseIds)}
          />
        </div>
      </div>

      {/* Completeness signal + proceed */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-5 py-3">
        <p className="text-sm text-ink-secondary">
          <span className="font-semibold text-ink">{confirmed} inputs confirmed</span>,{" "}
          {aiEstimated} AI-estimated · confidence:{" "}
          <span className="font-medium text-ink">{confidence}</span>
          {approach === "bottom_up" && (
            <span className="text-ink-tertiary"> · built up from use cases</span>
          )}
        </p>
        <button
          onClick={onNext}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Next: Build →
        </button>
      </div>
    </div>
  );
}
