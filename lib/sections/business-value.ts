import type { ProposalContext, Ranged, SectionOutput } from "@/lib/types";
import {
  annualValue,
  annualValueByUseCase,
} from "@/lib/economics/engine";
import { fmtRange, fmtRangeTriple } from "@/lib/format";

/**
 * Value of the future state, built BOTTOM-UP from selected use cases
 * (hours saved × loaded cost × volume) — never top-down "X% productivity".
 * All figures Ranged; reads ScenarioAssumptions.
 */
export function businessValueSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases } = ctx;
  const finalYear = a.horizonYears;

  const byUseCase = annualValueByUseCase(a, selectedUseCases, finalYear);
  const totalY1 = annualValue(a, selectedUseCases, 1);
  const totalFinal = annualValue(a, selectedUseCases, finalYear);

  const table = {
    columns: [
      "Use case",
      "Hours saved / instance",
      "Instances / user / mo",
      `Annual value (Y${finalYear})`,
    ],
    rows: byUseCase.map(({ useCase, value }) => [
      useCase.label,
      useCase.hoursSavedPerInstance
        ? fmtRangeTriple(useCase.hoursSavedPerInstance, (n) => `${n}h`)
        : "default",
      useCase.instancesPerMonthPerUser
        ? fmtRangeTriple(useCase.instancesPerMonthPerUser, (n) => `${n}`)
        : "default",
      fmtRange(value),
    ]),
  };

  const charts = [
    {
      name: `Annual value by use case (base, Y${finalYear})`,
      points: byUseCase.map(({ useCase, value }) => ({
        x: useCase.label,
        y: Math.round(value.base),
      })),
      format: "currency" as const,
    },
  ];

  const rangedFigures: Record<string, Ranged> = {
    annualValueY1: totalY1,
    annualValueFinalYear: totalFinal,
  };

  return {
    id: "business_value",
    kind: "business_value",
    title: "Business Value",
    subtitle: `Built bottom-up from ${selectedUseCases.length} selected use cases — not a top-down productivity claim`,
    bullets: [
      `Each use case is sized as hours saved per instance × instances per user per month × fully loaded cost`,
      `Value scales with both adoption dimensions: how many people use it (breadth) and how heavily they use it (depth)`,
      `Ranges reflect honest uncertainty — every figure shows conservative / base / optimistic, not a single point`,
    ],
    stats: [
      { label: "Annual value, Year 1", value: fmtRange(totalY1) },
      { label: `Annual value, Year ${finalYear}`, value: fmtRange(totalFinal) },
      {
        label: "Loaded hourly cost",
        value: fmtRangeTriple(a.loadedHourlyCost, (n) => `$${n}`),
      },
    ],
    table,
    charts,
    speakerNotes:
      `Every number in this table traces to two knobs per use case (hours saved, instances/month) ` +
      `plus the shared loaded-cost and adoption assumptions — walk the client through one row end-to-end ` +
      `to establish the method, then let them pressure-test the knobs. The bottom-up build is the credibility of the whole deck.`,
    rangedFigures,
    assumptionsUsed: [
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "loadedHourlyCost",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser)",
      `horizonYears (${a.horizonYears})`,
    ],
    order: 0,
    enabled: true,
  };
}
