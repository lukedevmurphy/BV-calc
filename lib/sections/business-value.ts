import type {
  ChartSeries,
  KeyValue,
  ProposalContext,
  Ranged,
  SectionOutput,
  TableData,
} from "@/lib/types";
import {
  annualValue,
  annualValueByUseCase,
  useCaseCoverage,
  valueRealization,
} from "@/lib/economics/engine";
import { interpolateRamp } from "@/lib/economics/ramp";
import { bandAroundBase } from "@/lib/economics/ranged";
import { codingFigures } from "@/lib/economics/coding";
import { itTakeoutFigures } from "@/lib/economics/it-takeout";
import {
  annualTopDownValue,
  topDownMatureValue,
  topDownPerUseCase,
} from "@/lib/economics/top-down";
import { savedHoursBasisFor } from "@/lib/data/hours-defaults";
import { APPROACH_BAND_HALF_WIDTH_PCT } from "@/lib/value-model/constants";
import {
  resolveSubIndustry,
  subIndustryDrivers,
  sectorDriverLabel,
  type SubIndustryId,
} from "@/lib/value-model/sub-industry";
import {
  VALUE_DRIVERS,
  DRIVER_ORDER,
  OUTCOMES,
  rollupUseCasesToDrivers,
  routeToOutcomes,
  type DriverId,
} from "@/lib/value-model/drivers";
import { illustrativeFlag, showDraftWarnings } from "@/lib/provenance";
import { fmtCurrency, fmtPercent, fmtRange, fmtRangeTriple } from "@/lib/format";

/** Capacity share (0..1) for the reinvestment routing; default blend. */
function capacityShare(ctx: ProposalContext): number {
  const v = ctx.assumptions.reinvestmentCapacity;
  return typeof v === "number" ? Math.min(1, Math.max(0, v)) : 0.6;
}

/**
 * Build the driver-tree artifacts shared by both approaches: a by-driver chart
 * (sector-named), the outcome-composition stats (routed by the reinvestment
 * posture), and the framing bullets. Totals are preserved — perDriver sums to
 * the section total, so rangedFigures are untouched.
 */
function driverArtifacts(
  subId: SubIndustryId,
  perDriver: Record<DriverId, number>,
  ctx: ProposalContext,
  finalYear: number,
): { chart: ChartSeries; extraStats: KeyValue[]; note: string } {
  const c = capacityShare(ctx);
  // Coding efficiency rides its OWN allocation slider (not the reinvestment
  // toggle), so it bypasses routeToOutcomes: it shows as its own driver bar, and
  // its two halves are added straight to the outcomes (cost-out → margin,
  // growth → revenue). perDriver itself is left untouched, so the use-case
  // rollup and its totals are unchanged.
  const coding = codingFigures(ctx.assumptions).finalYear;
  const itTakeout = itTakeoutFigures(ctx.assumptions).finalYear;
  const chartDrivers: Record<DriverId, number> = {
    ...perDriver,
    coding_efficiency: coding.total.base,
    it_takeout: itTakeout.takeout.base,
  };
  const points = DRIVER_ORDER.filter((d) => chartDrivers[d] > 1)
    .map((d) => ({
      x: sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short),
      y: Math.round(chartDrivers[d]),
    }))
    .sort((a, b) => b.y - a.y);

  const chart: ChartSeries = {
    name: `Annual value by value driver (base, Y${finalYear})`,
    points,
    format: "currency",
  };

  // Outcome composition lives in the STAT cards (one row — no height cost) so
  // check-sections / the Settings page can read it and it shifts with the
  // reinvestment toggle. The posture narration goes to speaker notes so the
  // slide's bullet budget (and the chart slot) is preserved.
  const out = routeToOutcomes(perDriver, c);
  out.margin += coding.costSavings.base; // coding cost-out → margin
  out.revenue += coding.revenueGrowth.base; // coding reinvested → faster revenue
  out.margin += itTakeout.takeout.base; // IT takeout: legacy cost-out → margin
  const order: (keyof typeof out)[] = ["revenue", "margin", "loss_avoidance"];
  const extraStats: KeyValue[] = order
    .filter((o) => out[o] > 1)
    .map((o) => ({ label: `→ ${OUTCOMES[o].label}`, value: fmtCurrency(out[o]) }));

  const cap = Math.round(c * 100);
  const sectorNote = subIndustryDrivers(subId).valueNote;
  const note =
    `Reinvestment posture ${cap}% capacity / ${100 - cap}% offset sets BOTH the realized total ` +
    `(capacity realizes less than offset, so moving the toggle moves the dollar total — not just its label) and where it lands: ` +
    order
      .filter((o) => out[o] > 1)
      .map((o) => `${fmtCurrency(out[o])} → ${OUTCOMES[o].label.toLowerCase()}`)
      .join(", ") +
    ` (change on the Settings page).` +
    (sectorNote ? ` ${sectorNote}` : "");

  return { chart, extraStats, note };
}

/**
 * The business-value case, built at the altitude the user picked
 * (assumptions.valueApproach):
 *   bottom_up — per use case, hours saved × loaded cost × volume. BUILDS each
 *               value driver up from use cases and sums them (the original
 *               path; base values unchanged). More inputs, more defensible.
 *   top_down  — whole company, top-line × addressable share × benchmark uplift.
 *               DERIVES the drivers from the top-line numbers. Fewer inputs,
 *               more assumptive.
 *
 * Both emit the SAME rangedFigures keys (annualValueY1, annualValueFinalYear)
 * and the same headline stats, so cost / forecast / exec summary stay agnostic
 * to which method produced the numbers. Only the derivation, the detail table,
 * and the confidence-band WIDTH differ — the band reflects methodological
 * confidence (coarser → wider) via bandAroundBase, not the engine's mechanical
 * compounding.
 */

interface ApproachResult {
  subtitle: string;
  bullets: string[];
  extraStats: KeyValue[];
  table?: TableData;
  charts?: ChartSeries[];
  speakerNotes: string;
  assumptionsUsed: string[];
  /** Central base estimates; the section bands them per approach. */
  y1Base: number;
  finalBase: number;
}

export function businessValueSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a } = ctx;
  const approach = a.valueApproach ?? "bottom_up";
  const finalYear = a.horizonYears;
  const halfWidth = APPROACH_BAND_HALF_WIDTH_PCT[approach];

  const r =
    approach === "top_down"
      ? buildTopDown(ctx, finalYear)
      : buildBottomUp(ctx, finalYear, halfWidth);

  // Fold the coding-efficiency driver into the headline (in BOTH approaches):
  // its realized total is added to the use-case / top-down base before banding,
  // so every downstream consumer (forecast ROI, exec summary, proposal,
  // scenario) inherits it. value_calculation adds the same figure to keep its
  // tie-out. Coding carries its OWN realization (offset/capacity) inside the
  // engine, so the folded figure stays credible against the ratio ceiling.
  const coding = codingFigures(a);
  const itTakeout = itTakeoutFigures(a);
  const extraY1 = coding.y1.total.base + itTakeout.y1.takeout.base;
  const extraFinal = coding.finalYear.total.base + itTakeout.finalYear.takeout.base;
  const annualValueY1 = bandAroundBase(r.y1Base + extraY1, halfWidth);
  const annualValueFinalYear = bandAroundBase(r.finalBase + extraFinal, halfWidth);

  const rangedFigures: Record<string, Ranged> = {
    annualValueY1,
    annualValueFinalYear,
  };

  // Hero = the Year-final annual value (the deck's anchor number; base-stripped
  // on this base-case slide). The supporting stats show where it LANDS (→ Revenue
  // / → Operating margin). The per-driver composition is the Value Map's job (its
  // ranked exhibit), so this slide doesn't repeat it — eliminating the old
  // value_map ↔ business_value overlap. The ramp (Year 1 → final) lives in the
  // Forecast appendix; coding / IT-takeout "of which" in their own slides + notes.
  const heroStat = {
    label: `Annual value, Y${finalYear}`,
    value: fmtRange(annualValueFinalYear),
    range: annualValueFinalYear,
  };
  // Supporting stats sit inline beside the hero — keep the two largest "where it
  // lands" outcomes; the full income-statement split is the Financial Rollup.
  const stats: KeyValue[] = r.extraStats.slice(0, 2);

  const trajectoryNote = ` Year 1 annual value ${fmtCurrency(annualValueY1.base)} → Year ${finalYear} ${fmtCurrency(annualValueFinalYear.base)} (the ramp is in the Forecast appendix).`;
  const codingNote =
    coding.finalYear.total.base > 1
      ? ` Of the Y${finalYear} total, coding efficiency contributes ${fmtRange(coding.finalYear.total)} (see appendix).`
      : "";
  const itNote =
    itTakeout.finalYear.takeout.base > 1
      ? ` IT cost takeout adds ${fmtRange(itTakeout.finalYear.takeout)} (see appendix).`
      : "";

  return {
    id: "business_value",
    kind: "business_value",
    title: "Business Value",
    subtitle: r.subtitle,
    bullets: r.bullets,
    heroStat,
    stats,
    table: r.table,
    speakerNotes: r.speakerNotes + trajectoryNote + codingNote + itNote,
    rangedFigures,
    assumptionsUsed: r.assumptionsUsed,
    order: 0,
    enabled: true,
  };
}

// ── bottom_up — per use case (the original build) ────────────────────────────

function buildBottomUp(
  ctx: ProposalContext,
  finalYear: number,
  halfWidth: number,
): ApproachResult {
  const { assumptions: a, selectedUseCases } = ctx;
  const subId = resolveSubIndustry(ctx.company.industry).id;
  // Sort highest → lowest by base value so the biggest contributors lead both
  // the table and the chart. Order is stable under the global ramp/adoption
  // multipliers (they scale every use case equally), so dragging sliders never
  // reshuffles the rows.
  const byUseCase = [...annualValueByUseCase(a, selectedUseCases, finalYear)].sort(
    (x, y) => y.value.base - x.value.base,
  );

  // Roll use-case value UP the tree to the value drivers (each use case's value
  // split equally across the drivers it feeds — totals preserved).
  const perDriver = rollupUseCasesToDrivers(
    byUseCase.map(({ useCase, value }) => ({
      id: useCase.id,
      value: value.base,
      drivers: useCase.drivers,
    })),
  );
  const tree = driverArtifacts(subId, perDriver, ctx, finalYear);

  // The use-case detail table stays the bottom-up credibility view (the use
  // case → driver MAPPING is surfaced in the picker, Part 2.2); the chart shows
  // the driver-level rollup (Part 2.4).
  const table: TableData = {
    columns: [
      "Use case",
      "Hours saved / instance",
      "Instances / user / mo",
      `Annual value, use-case only (Y${finalYear})`,
    ],
    rows: byUseCase.map(({ useCase, value }) => [
      useCase.label,
      useCase.hoursSavedPerInstance
        ? fmtRangeTriple(useCase.hoursSavedPerInstance, (n) => `${n}h`)
        : "default",
      useCase.instancesPerMonthPerUser
        ? fmtRangeTriple(useCase.instancesPerMonthPerUser, (n) => `${n}`)
        : "default",
      // Band each row at the approach half-width so rows agree with the total.
      fmtRange(bandAroundBase(value.base, halfWidth)),
    ]),
  };

  const charts: ChartSeries[] = [tree.chart];

  // Part 4 — show the realization work: gross saved-hours value is haircut by a
  // realization rate (posture-blended) and persona coverage before it is a dollar.
  const realization = valueRealization(a);
  const coverage = useCaseCoverage(a);
  const rzPct = Math.round(realization.base * 100);
  const covPct = Math.round(coverage * 100);
  // Hours basis for the top contributors → speaker notes (auditability, Part 3).
  const hoursBasis = byUseCase
    .slice(0, 3)
    .map(({ useCase }) => `${useCase.label}: ${savedHoursBasisFor(useCase.id)}`)
    .join("; ");

  return {
    subtitle: `Built bottom-up from ${selectedUseCases.length} selected use cases — realization-adjusted to a defensible dollar value, not raw saved time`,
    bullets: [
      `Realized value, not raw saved time: only ~${rzPct}% of freed hours are credited as dollars, and a typical adopter runs ~${covPct}% of the selected workflows`,
    ],
    extraStats: tree.extraStats,
    table,
    charts,
    speakerNotes:
      `Every number traces to two knobs per use case (hours saved, instances/month) plus loaded cost and adoption — ` +
      `then the gross saved-hours value is haircut to a REALIZED dollar value: ~${rzPct}% realization (a freed hour ` +
      `is only money if it is actually cut or monetized — capacity realizes less than offset) × ~${covPct}% persona ` +
      `coverage (a typical adopter runs only a subset of the selected workflows). Saved-hours are ESTIMATES to pressure-test — ` +
      `${hoursBasis}. ` +
      tree.note,
    assumptionsUsed: [
      "valueApproach (bottom_up)",
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "loadedHourlyCost",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser — estimates)",
      "value realization (offsetRealization / capacityRealization, by reinvestment posture)",
      "useCaseCoverage (persona overlap)",
      `horizonYears (${finalYear})`,
    ],
    y1Base: annualValue(a, selectedUseCases, 1).base,
    finalBase: annualValue(a, selectedUseCases, finalYear).base,
  };
}

// ── top_down — whole company ─────────────────────────────────────────────────

function buildTopDown(ctx: ProposalContext, finalYear: number): ApproachResult {
  const { valueModel: vm, company, selectedUseCases } = ctx;
  const toplineSource = vm.toplineSource?.trim() || "uncited — user to verify";
  // Sector vocabulary: sector-specific top-line label.
  const sub = resolveSubIndustry(company.industry);
  const v = sub.topDown;

  const matureBase = topDownMatureValue(vm);
  const baselinePct = Math.round((vm.topDownGrowthBaseline ?? 0) * 100);
  const liftedPct = Math.round(
    (vm.topDownGrowthLifted ?? vm.topDownGrowthBaseline ?? 0) * 100,
  );

  // Break the directional envelope across the selected use cases by value tier,
  // then roll to drivers (totals preserved; carries custom mappings).
  const perUseCase = topDownPerUseCase(vm, selectedUseCases);
  const perDriver = rollupUseCasesToDrivers(perUseCase);
  const tree = driverArtifacts(sub.id, perDriver, ctx, finalYear);

  const pctOfRev = (val: number) => (vm.topline > 0 ? fmtPercent(val / vm.topline) : "—");
  const ucRows: (string | number)[][] = perUseCase.length
    ? [...perUseCase]
        .sort((a, b) => b.value - a.value)
        .map((p) => {
          const uc = selectedUseCases.find((u) => u.id === p.id);
          return [uc?.label ?? p.id, `${fmtCurrency(p.value)} (${pctOfRev(p.value)})`];
        })
    : [["Use cases to validate", "—"]];

  const table: TableData = {
    columns: ["Top-down basis", "Value / share of revenue"],
    rows: [
      [v.toplineRowLabel, fmtCurrency(vm.topline)],
      ["AI revenue-growth lift", `${baselinePct}% → ${liftedPct}%`],
      ...ucRows,
      ["Total directional value", fmtCurrency(matureBase)],
    ],
  };

  // Placeholder financials must never reach a CLIENT deck unflagged; in draft
  // mode the flag is shown, in client mode it's suppressed.
  const flag = showDraftWarnings(ctx.assumptions) ? illustrativeFlag(company) : null;

  return {
    subtitle: `Top-down SWAG: AI lifts ${v.toplineRowLabel.toLowerCase()} growth ${baselinePct}% → ${liftedPct}%, broken across the selected use cases`,
    bullets: [
      `Directional value ≈ ${v.toplineRowLabel.toLowerCase()} × (AI-lifted growth ${liftedPct}% − baseline ${baselinePct}%) × realization`,
      ...(flag ? [flag] : []),
    ],
    extraStats: [
      { label: "Revenue-growth lift", value: `${baselinePct}% → ${liftedPct}%` },
      { label: "Realization", value: fmtPercent(vm.realizationFactor.base) },
      ...tree.extraStats,
    ],
    table,
    charts: [tree.chart],
    speakerNotes:
      `Top-down is the low-data SWAG for the first meeting: from public financials, estimate how much AI lifts the company's ` +
      `revenue-growth rate (${baselinePct}% → ${liftedPct}%), value it against the topline, and break it across the use cases by ` +
      `value tier (higher-value workflows take a larger slice). ${v.toplineRowLabel} ${fmtCurrency(vm.topline)} — source: ${toplineSource}. ` +
      `This is a low-data first-pass estimate (widest band); refine with a bottom-up build next. Each use case is intentionally ` +
      `"almost blank" here — the detail comes in the bottom-up follow-up. ` +
      tree.note,
    assumptionsUsed: [
      "valueApproach (top_down)",
      "topline (source above)",
      "topDownGrowthBaseline / topDownGrowthLifted (revenue-growth lift)",
      "realizationFactor",
      "selected use cases + value tiers (topDownUseCaseWeights)",
      "adoptionBreadth (Year-1 time-shape)",
      `horizonYears (${finalYear})`,
    ],
    y1Base: annualTopDownValue(ctx.assumptions, vm, 1).base,
    finalBase: matureBase,
  };
}

/** Year-1 / final-year base ratio from the adoption-breadth ramp, so the
 *  whole-company approaches still show a ramp across the horizon. */
function breadthRatio(ctx: ProposalContext, finalYear: number): number {
  const final = interpolateRamp(ctx.assumptions.adoptionBreadth, finalYear).base;
  const y1 = interpolateRamp(ctx.assumptions.adoptionBreadth, 1).base;
  return final > 0 ? y1 / final : 1;
}
