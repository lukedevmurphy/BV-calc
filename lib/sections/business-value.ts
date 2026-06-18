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
  allocateByWeights,
  routeToOutcomes,
  type DriverId,
} from "@/lib/value-model/drivers";
import { illustrativeFlag } from "@/lib/provenance";
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
  const points = DRIVER_ORDER.filter((d) => perDriver[d] > 1)
    .map((d) => ({
      x: sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short),
      y: Math.round(perDriver[d]),
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

  const annualValueY1 = bandAroundBase(r.y1Base, halfWidth);
  const annualValueFinalYear = bandAroundBase(r.finalBase, halfWidth);

  const rangedFigures: Record<string, Ranged> = {
    annualValueY1,
    annualValueFinalYear,
  };

  return {
    id: "business_value",
    kind: "business_value",
    title: "Business Value",
    subtitle: r.subtitle,
    bullets: r.bullets,
    stats: [
      { label: "Annual value, Year 1", value: fmtRange(annualValueY1) },
      { label: `Annual value, Year ${finalYear}`, value: fmtRange(annualValueFinalYear) },
      ...r.extraStats,
    ],
    table: r.table,
    charts: r.charts,
    speakerNotes: r.speakerNotes,
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
    byUseCase.map(({ useCase, value }) => ({ id: useCase.id, value: value.base })),
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
      `Each use case = hours saved/instance × instances/user/mo × loaded cost, scaled by adoption breadth × usage depth — then realization-adjusted`,
      `Realized value, not raw saved time: only ~${rzPct}% of freed hours are credited as dollars (capacity realizes less than offset), and a typical adopter runs ~${covPct}% of the selected workflows`,
      `Use cases roll up to value drivers → a financial outcome; the reinvestment posture sets the outcome mix AND the realized total (edit on Settings)`,
    ],
    extraStats: [
      {
        label: "Loaded hourly cost",
        value: fmtRangeTriple(a.loadedHourlyCost, (n) => `$${n}`),
      },
      ...tree.extraStats,
    ],
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
  const { valueModel: vm, company } = ctx;
  const ratio = breadthRatio(ctx, finalYear);
  const source = vm.upliftSource?.trim() || "uncited — user to verify";
  // Sector vocabulary: same math, sector-specific driver labels.
  const sub = resolveSubIndustry(company.industry);
  const v = sub.topDown;

  const matureBase =
    vm.topline.base *
    vm.addressableShare.base *
    vm.upliftPct.base *
    vm.realizationFactor.base;

  // Allocate the whole-company total across the value drivers by the sector's
  // driver weighting (totals preserved), then route to outcomes.
  const perDriver = allocateByWeights(matureBase, subIndustryDrivers(sub.id).driverWeights);
  const tree = driverArtifacts(sub.id, perDriver, ctx, finalYear);

  const table: TableData = {
    columns: ["Driver", "Value"],
    rows: [
      [v.toplineRowLabel, fmtRange(vm.topline)],
      [v.addressableRowLabel, fmtPercent(vm.addressableShare.base)],
      [v.upliftRowLabel, fmtPercent(vm.upliftPct.base)],
      [v.realizationRowLabel, fmtPercent(vm.realizationFactor.base)],
      [`Annual value (Y${finalYear})`, fmtCurrency(matureBase)],
    ],
  };

  // Placeholder financials must never reach the deck unflagged.
  const flag = illustrativeFlag(company);

  return {
    subtitle: `Top-down from ${v.toplineRowLabel.toLowerCase()} × ${v.addressableRowLabel.toLowerCase()} × ${v.upliftRowLabel.toLowerCase()} — fast, cited, widest band`,
    bullets: [
      `Annual value ≈ ${v.toplineRowLabel.toLowerCase()} × ${v.addressableRowLabel.toLowerCase()} × ${v.upliftRowLabel.toLowerCase()} × realization factor`,
      `${v.upliftRowLabel} ${fmtPercent(vm.upliftPct.base)} — source: ${source}`,
      `Widest confidence band of the two approaches — a fast, whole-company estimate to be refined by going deeper`,
      ...(flag ? [flag] : []),
    ],
    extraStats: [
      { label: "Benchmark uplift", value: fmtRangeTriple(vm.upliftPct, fmtPercent) },
      { label: "Addressable share", value: fmtPercent(vm.addressableShare.base) },
      ...tree.extraStats,
    ],
    table,
    charts: [tree.chart],
    speakerNotes:
      `This is the fastest altitude: one top-line figure scaled by a cited benchmark uplift and a realization haircut. ` +
      `The credibility here IS the citation — lead with the source, and flag explicitly when a percentage is uncited so ` +
      `the client knows what still needs verifying. Drag the slider deeper to replace the benchmark with the client's own volumes. ` +
      tree.note,
    assumptionsUsed: [
      "valueApproach (top_down)",
      "topline",
      "addressableShare",
      `upliftPct (source: ${source})`,
      "realizationFactor",
      "adoptionBreadth (Year-1 time-shape)",
      `horizonYears (${finalYear})`,
    ],
    y1Base: matureBase * ratio,
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
