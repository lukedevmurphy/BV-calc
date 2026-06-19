import type { ProposalContext, Ranged, SectionOutput } from "@/lib/types";
import {
  annualTokenCost,
  annualValue,
  breakEvenMonth,
  yearlySeries,
} from "@/lib/economics/engine";
import { netVsCost, ratioVsCost } from "@/lib/economics/ranged";
import { fmtMonth, fmtRange } from "@/lib/format";
import { annualTopDownCost, annualTopDownValue } from "@/lib/economics/top-down";

/**
 * Multi-year, two-dimensional scenario-banded forecast (breadth × depth,
 * low/base/high). Renders value bands vs. cost bands as a funnel — narrow
 * near-term, widening over time — plus the break-even period.
 */
export function forecastSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases, priorSections } = ctx;
  const finalYear = a.horizonYears;

  if ((a.valueApproach ?? "bottom_up") === "top_down") {
    return topDownForecast(ctx);
  }

  const series = yearlySeries(a, selectedUseCases);
  const be = breakEvenMonth(a, selectedUseCases);
  const hasOverrides = Object.values(a.annualCostOverrides ?? {}).some((value) => value > 0);

  // Net and ROI are derived from the SAME displayed bands the deck shows — the
  // business-value section's methodological band (bandAroundBase) and the cost
  // section's token band — NOT the engine's raw multiplicative band. Otherwise
  // the headline ratio/net would carry the 7-factor compounding spread (a
  // wildly wide, indefensible optimistic edge) while the value stat shows the
  // tight band — the exact inconsistency a CFO would catch. Fall back to the
  // engine figures if a prior section is somehow absent (standalone/tests).
  const valueFinal =
    priorSections.business_value?.rangedFigures?.annualValueFinalYear ??
    annualValue(a, selectedUseCases, finalYear);
  const costFinal =
    priorSections.cost?.rangedFigures?.annualCostFinalYear ??
    annualTokenCost(a, selectedUseCases, finalYear);
  const netFinal = netVsCost(valueFinal, costFinal);
  const roiFinal = ratioVsCost(valueFinal, costFinal);

  // Cumulative net over the horizon, including the one-time implementation
  // cost — anti-paired edges (conservative = low value, high costs).
  const cumulative = cumulativeNet(a, series);

  const rangedFigures: Record<string, Ranged> = {
    netFinalYear: netFinal,
    roiFinalYear: roiFinal,
    cumulativeNetHorizon: cumulative,
  };

  return {
    id: "forecast",
    kind: "forecast",
    title: "Forecast",
    subtitle: `${finalYear}-year outlook, banded across both adoption dimensions (breadth × depth)`,
    bullets: [
      `The bands are the honest part: near-term is knowable, out-years depend on how adoption actually ramps — so the funnel widens by construction`,
      `Value and cost rise together (consumption pricing), but value compounds faster because it is built on expert hours, not tokens`,
      hasOverrides
        ? "Direct annual cost overrides are reflected in net value and cumulative net"
        : `Break-even — cumulative value covering consumption plus implementation — lands at ${fmtMonth(be.base)} in the base case`,
    ],
    stats: [
      { label: `Net value, Year ${finalYear}`, value: fmtRange(netFinal) },
      {
        label: `Cumulative net, ${finalYear}yr`,
        value: fmtRange(cumulative),
      },
      ...(!hasOverrides ? [{
        label: "Break-even period",
        value: `${fmtMonth(be.base)} (${fmtMonth(be.high)}–${fmtMonth(be.low)})`,
      }] : []),
    ],
    bandedCharts: [series.value, series.cost],
    speakerNotes:
      `This is the killer chart: drag any adoption or depth slider and the bands re-flow live. Point out that the cost band ` +
      `rising is the success case — it only rises if people actually use it — and the gap between the bands is the business case. ` +
      `If asked why the bands widen: each year multiplies more uncertain quantities, and pretending otherwise would be a point ` +
      `estimate wearing a costume.`,
    rangedFigures,
    assumptionsUsed: [
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "per-use-case tokens (estimate)",
      "cacheHitRatio",
      "batchShare",
      "modelMix",
      "loadedHourlyCost",
      "implementationCost",
      `horizonYears (${a.horizonYears})`,
    ],
    order: 0,
    enabled: true,
  };
}

function topDownForecast(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, valueModel } = ctx;
  const years = Array.from({ length: a.horizonYears }, (_, index) => index + 1);
  const values = years.map((year) => annualTopDownValue(a, valueModel, year));
  const costs = years.map((year) => annualTopDownCost(valueModel, year));
  const nets = values.map((value, index) => netVsCost(value, costs[index]));
  const final = nets[nets.length - 1];
  const cumulative: Ranged = {
    low: values.reduce((sum, value) => sum + value.low, 0) - costs.reduce((sum, cost) => sum + cost.high, 0),
    base: values.reduce((sum, value) => sum + value.base, 0) - costs.reduce((sum, cost) => sum + cost.base, 0),
    high: values.reduce((sum, value) => sum + value.high, 0) - costs.reduce((sum, cost) => sum + cost.low, 0),
  };
  const costFinal = costs[costs.length - 1];
  return {
    id: "forecast",
    kind: "forecast",
    title: "Directional Forecast",
    subtitle: `${a.horizonYears}-year CFO view — value ramp plus optional direct cost SWAG`,
    bullets: [
      "Value follows the adoption ramp applied to the company-level directional estimate",
      costs.some((cost) => cost.base > 0) ? "Annual costs are direct AE inputs, not token-derived estimates" : "No annual costs entered — the forecast intentionally remains value-only",
      "The wide value band communicates the uncertainty of a top-down estimate",
    ],
    stats: [
      { label: `Net value, Year ${a.horizonYears}`, value: fmtRange(final) },
      { label: `Cumulative net, ${a.horizonYears}yr`, value: fmtRange(cumulative) },
    ],
    bandedCharts: [
      { name: "Annual directional value", points: years.map((year, index) => ({ x: `Year ${year}`, ...values[index] })), format: "currency" },
      ...(costs.some((cost) => cost.base > 0) ? [{ name: "Direct annual cost", points: years.map((year, index) => ({ x: `Year ${year}`, ...costs[index] })), format: "currency" as const }] : []),
    ],
    rangedFigures: { netFinalYear: final, roiFinalYear: ratioVsCost(values[values.length - 1], costFinal), cumulativeNetHorizon: cumulative },
    speakerNotes: "Keep this readout at CFO altitude: directional value, explicit uncertainty, and only directly entered costs.",
    assumptionsUsed: ["top-down value model", "adoptionBreadth", "topDownAnnualCosts"],
    order: 0,
    enabled: true,
  };
}

function cumulativeNet(
  a: ProposalContext["assumptions"],
  series: ReturnType<typeof yearlySeries>,
): Ranged {
  const sumEdge = (pts: { low: number; base: number; high: number }[], edge: "low" | "base" | "high") =>
    pts.reduce((acc, p) => acc + p[edge], 0);
  return {
    low:
      sumEdge(series.value.points, "low") -
      sumEdge(series.cost.points, "high") -
      a.implementationCost.high,
    base:
      sumEdge(series.value.points, "base") -
      sumEdge(series.cost.points, "base") -
      a.implementationCost.base,
    high:
      sumEdge(series.value.points, "high") -
      sumEdge(series.cost.points, "low") -
      a.implementationCost.low,
  };
}
