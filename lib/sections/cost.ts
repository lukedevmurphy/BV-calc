import type { ProposalContext, Ranged, SectionOutput } from "@/lib/types";
import {
  annualTokenCost,
  avgCostPerTask,
  blendedInputPricePerMTok,
  blendedOutputPricePerMTok,
  breakEvenAdoption,
  breakEvenMonth,
  costPerTask,
  costValueByAdoption,
  tokensForUseCase,
} from "@/lib/economics/engine";
import { tokenDefaultFor } from "@/lib/data/token-defaults";
import { annualTopDownCost } from "@/lib/economics/top-down";
import { exact } from "@/lib/economics/ranged";
import {
  fmtCurrency,
  fmtCurrencySmall,
  fmtMonth,
  fmtNumber,
  fmtPercent,
  fmtRange,
} from "@/lib/format";

/**
 * Consumption-based cost. Spine:
 *   cost = active users × (per-use-case instances) × tokens/task × blended
 *          $/token, with prompt-caching + Batch discounts.
 *
 * DEFENSIBILITY OVER ACCURACY: token volumes are ENGINEERING ESTIMATES (no
 * public benchmark exists), so the section shows its ARITHMETIC and separates
 * what's sourceable (prices, caching %, doc sizes) from what's assumed (docs
 * per task, output length, adoption, model mix). Cost is a WIDE RANGE driven by
 * implementation — the section says so plainly, and the band on the chart is the
 * token/implementation spread.
 */
export function costSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases } = ctx;
  const finalYear = a.horizonYears;

  if ((a.valueApproach ?? "bottom_up") === "top_down") {
    const years = Array.from({ length: finalYear }, (_, index) => index + 1);
    const costs = years.map((year) => annualTopDownCost(ctx.valueModel, year));
    const costY1 = costs[0];
    const costFinal = costs[costs.length - 1];
    const hasCost = costs.some((cost) => cost.base > 0);
    return {
      id: "cost",
      kind: "cost",
      title: "Cost — Optional Directional Input",
      subtitle: hasCost
        ? "AE-entered annual cost SWAG — no use-case or token model implied"
        : "Value-only CFO view — no cost estimate entered",
      bullets: hasCost
        ? [
            "Costs are direct annual inputs supplied by the account team; they are not derived from workflows, users, or tokens",
            "The entered amount is the base case; the forecast applies a ±25% confidence band around each annual cost",
            "Use this only when there is a credible implementation or run-rate estimate to offset against value",
            "Set a year to $0 to keep that year value-only",
          ]
        : [
            "No costs were entered, so this proposal presents directional annual value without manufacturing a cost estimate",
            "An AE can add annual cost SWAGs from the Top-down Inputs screen if a credible estimate becomes available",
          ],
      stats: [
        { label: "Annual cost, Year 1", value: fmtRange(costY1) },
        { label: `Annual cost, Year ${finalYear}`, value: fmtRange(costFinal) },
      ],
      bandedCharts: hasCost
        ? [{ name: "Direct annual cost", points: years.map((year, index) => ({ x: `Year ${year}`, ...costs[index] })), format: "currency" }]
        : undefined,
      rangedFigures: { annualCostY1: costY1, annualCostFinalYear: costFinal, implementationCost: exact(0) },
      speakerNotes: "Top-down cost is optional and direct. Its ±25% band is intentionally narrower than the ±35% directional value band. Never imply token-level precision when the value case itself is directional.",
      assumptionsUsed: ["topDownAnnualCosts (optional direct input)"],
      order: 0,
      enabled: true,
    };
  }

  const costY1 = annualTokenCost(a, selectedUseCases, 1);
  const costFinal = annualTokenCost(a, selectedUseCases, finalYear);
  const hasOverrides = Object.values(a.annualCostOverrides ?? {}).some((value) => value > 0);
  const be = breakEvenMonth(a, selectedUseCases);
  const beAdoption = breakEvenAdoption(a, selectedUseCases);
  const byAdoption = costValueByAdoption(a, selectedUseCases);

  // Lever before/after: cost with no caching + no batch vs the current settings.
  const gross = annualTokenCost(
    { ...a, cacheHitRatio: 0, batchShare: 0 },
    selectedUseCases,
    finalYear,
  ).base;
  const leverSavings = gross > 0 ? 1 - costFinal.base / gross : 0;

  const cachePct = Math.round((a.cacheHitRatio ?? 0) * 100);
  const batchPct = Math.round((a.batchShare ?? 0) * 100);
  const inMTok = blendedInputPricePerMTok(a);
  const outMTok = blendedOutputPricePerMTok(a);

  // Per-use-case token arithmetic (the assumed driver). It lives in speaker
  // notes + the editable cost-model panel rather than a slide table, so the
  // cost-vs-adoption band chart stays the primary visual element on the slide.
  const arithmetic = selectedUseCases
    .map((uc) => {
      const tok = tokensForUseCase(a, uc);
      return `${uc.label} — ${fmtNumber(tok.input.base)} in / ${fmtNumber(tok.output.base)} out → ${fmtCurrencySmall(costPerTask(a, uc).base)}/task`;
    })
    .join("; ");

  const bandedCharts = hasOverrides ? [
    {
      name: "Annual cost (direct overrides replace modeled years)",
      points: Array.from({ length: finalYear }, (_, index) => {
        const year = index + 1;
        return { x: `Year ${year}`, ...annualTokenCost(a, selectedUseCases, year) };
      }),
      format: "currency" as const,
    },
  ] : [
    {
      name: "Annual cost vs. adoption breadth (band = token / implementation range)",
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

  // Per-use-case basis notes (the estimate rationale) → speaker notes, so an
  // assumed token count is never presented as a sourced fact on the slide.
  const basisNotes = selectedUseCases
    .map((uc) => `${uc.label}: ${tokenDefaultFor(uc.id).basis}`)
    .join("; ");

  return {
    id: "cost",
    kind: "cost",
    title: "Cost — Consumption-Based",
    subtitle:
      "A WIDE range driven by implementation — tokens per task, caching, model mix, and adoption",
    bullets: [
      `Cost = active users × tasks per use case × tokens per task × blended $/token — every task that creates value also spends tokens`,
      `Token volumes are ESTIMATES, not sourced facts: document-heavy tasks ingest source docs and emit long structured output, and a single agentic task can reach 400K–2M cumulative input tokens — the range is the message`,
      `Sourceable: model prices ($5/$25, $3/$15, $1/$5 per MTok), ~90% cached-input discount, ~50% Batch discount, a 10-K ≈ 100–300K tokens. Assumed: docs/task, output length, adoption, model mix`,
      hasOverrides
        ? "Direct annual overrides replace the token model for entered years; remaining years stay modeled"
        : `Levers applied — ${cachePct}% prompt-cache hit + ${batchPct}% Batch — cut blended cost ~${Math.round(leverSavings * 100)}% vs no levers (${fmtCurrency(gross)} → ${fmtCurrency(costFinal.base)})`,
      hasOverrides
        ? "Forecast uses the overridden annual totals rather than implying token-level precision"
        : `Break-even: cumulative value covers consumption plus the one-time implementation cost (${fmtCurrency(a.implementationCost.base)}, amortized) at ${fmtMonth(be.base)} in the base case`,
    ],
    // Four stats, one row (no break-even period — it lives in the Forecast).
    stats: [
      { label: "Annual cost, Year 1", value: fmtCurrency(costY1.base) },
      { label: `Annual cost, Year ${finalYear}`, value: fmtCurrency(costFinal.base) },
      hasOverrides
        ? { label: "Cost basis", value: "Direct override + modeled years" }
        : { label: "Blended $/task (avg)", value: fmtCurrencySmall(avgCostPerTask(a, selectedUseCases)) },
      ...(!hasOverrides ? [{
        label: "Break-even adoption",
        value:
          beAdoption === null
            ? "not within model"
            : `≥ ${fmtPercent(beAdoption)} of target users`,
      }] : []),
    ],
    bandedCharts,
    rangedFigures,
    speakerNotes:
      `Lead with the honesty: token volumes are estimates, not sourced facts — there is no public "tokens per DDQ" benchmark, ` +
      `so credibility comes from showing the arithmetic and the levers, not from a number that doesn't exist. Blended list price is ` +
      `~$${inMTok.toFixed(2)}/MTok in, $${outMTok.toFixed(2)}/MTok out before the ${cachePct}% cache / ${batchPct}% batch discounts. ` +
      `Per-use-case arithmetic (base) — ${arithmetic}. Basis — ${basisNotes}. Every token volume, the cache/batch levers, the model ` +
      `mix and prices are user-editable and persist with the proposal; walk the client through one row, then let them set their own ` +
      `implementation assumptions.`,
    assumptionsUsed: [
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "per-use-case tokens (input/output, estimate — varies by implementation)",
      "cacheHitRatio (~90% off cached input)",
      "batchShare (~50% off)",
      "modelMix (prices and shares)",
      "implementationCost",
    ],
    order: 0,
    enabled: true,
  };
}
