import type {
  ChartSeries,
  KeyValue,
  ProposalContext,
  Ranged,
  SectionOutput,
  TableData,
} from "@/lib/types";
import { annualValue, annualValueByUseCase } from "@/lib/economics/engine";
import { interpolateRamp } from "@/lib/economics/ramp";
import { bandAroundBase } from "@/lib/economics/ranged";
import { APPROACH_BAND_HALF_WIDTH_PCT } from "@/lib/value-model/constants";
import { fmtCurrency, fmtPercent, fmtRange, fmtRangeTriple } from "@/lib/format";

/**
 * The business-value case, built at the altitude the user picked
 * (assumptions.valueApproach):
 *   bottom_up — per use case, hours saved × loaded cost × volume (the original
 *               path; base values unchanged).
 *   middle    — per value pool, size × uplift × adoption.
 *   top_down  — whole company, top-line × addressable share × benchmark uplift.
 *
 * All three emit the SAME rangedFigures keys (annualValueY1, annualValueFinal-
 * Year) and the same headline stats, so cost / forecast / exec summary stay
 * agnostic to which method produced the numbers. Only the derivation, the
 * detail table, and the confidence-band WIDTH differ — the band reflects
 * methodological confidence (coarser → wider) via bandAroundBase, not the
 * engine's mechanical compounding.
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
      : approach === "middle"
        ? buildMiddle(ctx, finalYear)
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
  const byUseCase = annualValueByUseCase(a, selectedUseCases, finalYear);

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

  const charts: ChartSeries[] = [
    {
      name: `Annual value by use case (base, Y${finalYear})`,
      points: byUseCase.map(({ useCase, value }) => ({
        x: useCase.label,
        y: Math.round(value.base),
      })),
      format: "currency",
    },
  ];

  return {
    subtitle: `Built bottom-up from ${selectedUseCases.length} selected use cases — not a top-down productivity claim`,
    bullets: [
      `Each use case is sized as hours saved per instance × instances per user per month × fully loaded cost`,
      `Value scales with both adoption dimensions: how many people use it (breadth) and how heavily they use it (depth)`,
      `Tightest confidence band of the three approaches — each figure traces to two quantified knobs per use case, so the spread is the narrowest`,
    ],
    extraStats: [
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
    assumptionsUsed: [
      "valueApproach (bottom_up)",
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "loadedHourlyCost",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser)",
      `horizonYears (${finalYear})`,
    ],
    y1Base: annualValue(a, selectedUseCases, 1).base,
    finalBase: annualValue(a, selectedUseCases, finalYear).base,
  };
}

// ── middle — per value pool ──────────────────────────────────────────────────

function buildMiddle(ctx: ProposalContext, finalYear: number): ApproachResult {
  const { assumptions: a, valueModel } = ctx;
  const pools = valueModel.valuePools;
  const ratio = breadthRatio(ctx, finalYear);

  const poolMature = (p: (typeof pools)[number]) =>
    p.size.base * p.upliftPct.base * p.adoption.base;
  const matureBase = pools.reduce((acc, p) => acc + poolMature(p), 0);

  const table: TableData = {
    columns: ["Value pool", "Pool size", "Uplift", "Adoption", `Annual value (Y${finalYear})`],
    rows: pools.map((p) => [
      p.label,
      fmtRange(p.size),
      fmtPercent(p.upliftPct.base),
      fmtPercent(p.adoption.base),
      fmtCurrency(poolMature(p)),
    ]),
  };

  const charts: ChartSeries[] = [
    {
      name: `Annual value by value pool (base, Y${finalYear})`,
      points: pools.map((p) => ({ x: p.label, y: Math.round(poolMature(p)) })),
      format: "currency",
    },
  ];

  return {
    subtitle: `Sized per value pool across ${pools.length} functions — benchmark-anchored, medium confidence band`,
    bullets: [
      `Each value pool is sized as pool size × efficiency uplift × adoption`,
      `Function-level resolution: more defensible than a single company-wide percentage, lighter than per-use-case`,
      `Medium confidence band — wider than the bottom-up roll-up, tighter than the top-down benchmark`,
    ],
    extraStats: [{ label: "Value pools", value: `${pools.length}` }],
    table,
    charts,
    speakerNotes:
      `Each row is a function-level value pool sized from the company's labor base, with a benchmark uplift and an ` +
      `adoption assumption you can pressure-test pool by pool. Use this altitude when per-use-case detail isn't yet ` +
      `available but a single top-down percentage would feel hand-wavy.`,
    assumptionsUsed: [
      "valueApproach (middle)",
      "valuePools (size × uplift × adoption)",
      "adoptionBreadth (Year-1 time-shape)",
      `horizonYears (${finalYear})`,
    ],
    y1Base: matureBase * ratio,
    finalBase: matureBase,
  };
}

// ── top_down — whole company ─────────────────────────────────────────────────

function buildTopDown(ctx: ProposalContext, finalYear: number): ApproachResult {
  const { valueModel: vm } = ctx;
  const ratio = breadthRatio(ctx, finalYear);
  const source = vm.upliftSource?.trim() || "uncited — user to verify";

  const matureBase =
    vm.topline.base *
    vm.addressableShare.base *
    vm.upliftPct.base *
    vm.realizationFactor.base;

  const table: TableData = {
    columns: ["Driver", "Value"],
    rows: [
      ["Company top-line", fmtRange(vm.topline)],
      ["Addressable share", fmtPercent(vm.addressableShare.base)],
      ["Benchmark uplift", fmtPercent(vm.upliftPct.base)],
      ["Realization factor", fmtPercent(vm.realizationFactor.base)],
      [`Annual value (Y${finalYear})`, fmtCurrency(matureBase)],
    ],
  };

  return {
    subtitle: `Top-down from top-line × addressable share × benchmark uplift — fast, cited, widest band`,
    bullets: [
      `Annual value ≈ company top-line × addressable share × benchmark efficiency uplift × realization factor`,
      `Benchmark uplift ${fmtPercent(vm.upliftPct.base)} — source: ${source}`,
      `Widest confidence band of the three — a fast, whole-company estimate to be refined by going deeper`,
    ],
    extraStats: [
      { label: "Benchmark uplift", value: fmtRangeTriple(vm.upliftPct, fmtPercent) },
      { label: "Addressable share", value: fmtPercent(vm.addressableShare.base) },
    ],
    table,
    speakerNotes:
      `This is the fastest altitude: one top-line figure scaled by a cited benchmark uplift and a realization haircut. ` +
      `The credibility here IS the citation — lead with the source, and flag explicitly when a percentage is uncited so ` +
      `the client knows what still needs verifying. Drag the slider deeper to replace the benchmark with the client's own volumes.`,
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
