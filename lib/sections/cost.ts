import type { ProposalContext, Ranged, SectionOutput } from "@/lib/types";
import {
  annualTokenCost,
  blendedPricePerTask,
  breakEvenAdoption,
  breakEvenMonth,
  costValueByAdoption,
} from "@/lib/economics/engine";
import {
  fmtCurrency,
  fmtCurrencySmall,
  fmtMonth,
  fmtPercent,
  fmtRange,
} from "@/lib/format";

/**
 * Consumption-based cost. Formula spine:
 *   cost = activeUsers(breadth) × tasksPerUser × depth × tokensPerTask
 *          × pricePerToken(modelMix)
 * Must make the consumption truth explicit — higher adoption raises cost —
 * and surface break-even (both the adoption level and the period).
 */
export function costSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases } = ctx;
  const finalYear = a.horizonYears;

  const pricePerTask = blendedPricePerTask(a);
  const costY1 = annualTokenCost(a, 1);
  const costFinal = annualTokenCost(a, finalYear);
  const be = breakEvenMonth(a, selectedUseCases);
  const beAdoption = breakEvenAdoption(a, selectedUseCases);
  const byAdoption = costValueByAdoption(a, selectedUseCases);

  // Only models that actually carry task volume belong in the cost table.
  // Inactive rows (0% share) — e.g. a restricted/placeholder model like Fable 5
  // — contribute nothing to cost and would just bloat the slide; they stay
  // visible/editable in the model-mix editor on the Inputs screen.
  const activeMix = a.modelMix.filter((m) => m.sharePct > 0);
  const table = {
    columns: ["Model (editable)", "Share of tasks", "Input $/MTok", "Output $/MTok"],
    rows: (activeMix.length > 0 ? activeMix : a.modelMix).map((m) => [
      m.label,
      fmtPercent(m.sharePct / 100),
      `$${m.inputPricePerMTok}`,
      `$${m.outputPricePerMTok}`,
    ]),
  };

  const bandedCharts = [
    {
      name: "Annual cost vs. adoption breadth (at mature usage depth)",
      points: byAdoption.map(({ breadth, cost }) => ({
        x: fmtPercent(breadth),
        low: Math.round(cost.low),
        base: Math.round(cost.base),
        high: Math.round(cost.high),
      })),
      format: "currency" as const,
    },
  ];

  const rangedFigures: Record<string, Ranged> = {
    annualCostY1: costY1,
    annualCostFinalYear: costFinal,
    implementationCost: a.implementationCost,
  };

  return {
    id: "cost",
    kind: "cost",
    title: "Cost — Consumption-Based",
    subtitle: "Pricing scales with usage: more adoption and heavier usage mean higher cost — by design",
    bullets: [
      `Cost = active users (breadth) × tasks per user (depth) × tokens per task × blended price per token`,
      `Higher adoption raises cost — that is the consumption truth, and it is the success case: spend tracks realized usage, not shelfware seats`,
      `Blended price per task is ${fmtCurrencySmall(pricePerTask)} at the current model mix — every price and share below is editable`,
      `Break-even: value covers consumption plus the one-time implementation cost (${fmtCurrency(a.implementationCost.base)}) at ${fmtMonth(be.base)} in the base case`,
    ],
    stats: [
      { label: "Annual cost, Year 1", value: fmtRange(costY1) },
      { label: `Annual cost, Year ${finalYear}`, value: fmtRange(costFinal) },
      {
        label: "Break-even period",
        value: `${fmtMonth(be.base)} (optimistic ${fmtMonth(be.high)}, conservative ${fmtMonth(be.low)})`,
      },
      {
        label: "Break-even adoption",
        value:
          beAdoption === null
            ? "not within model"
            : `≥ ${fmtPercent(beAdoption)} of target users`,
      },
    ],
    table,
    bandedCharts,
    speakerNotes:
      `Lead with the consumption framing: unlike per-seat SaaS, cost rises with adoption — which means the bill is an adoption ` +
      `signal, not a fixed bet. The chart shows annual cost across adoption levels at mature usage depth; pair it with the value ` +
      `line in the forecast. Model prices are placeholders to confirm against current published pricing before presenting.`,
    rangedFigures,
    assumptionsUsed: [
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "avgTasksPerActiveUserPerMonth",
      "avgTokensPerTask",
      "modelMix (prices and shares)",
      "implementationCost",
    ],
    order: 0,
    enabled: true,
  };
}
