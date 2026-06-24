// ─────────────────────────────────────────────────────────────────────────────
// Coding-efficiency driver — the one value source the FS use-case catalog lacks,
// yet the #1 enterprise AI use case. Freed engineering capacity is one pool,
// valued two ways and blended by the `allocation` slider:
//
//   freedHours = coders × timeOnCodePct × efficiencyGain × HOURS_PER_YEAR,
//                ramped by adoption breadth
//
//   cost-out (allocation)     = freedHours × loaded $/hr × OFFSET realization
//   revenue  (1 − allocation) = topline × baseline growth × (stepUp − 1)
//                               × CAPACITY realization, ramped
//
// Both halves are value-direction, so element-wise mul/scale/add are correct
// here (this is NOT an anti-paired value-vs-cost op — see ranged.ts/netVsCost).
// Both reuse the SAME realization haircuts as the bottom-up value, so the total
// folds into the Business Value headline without inflating ROI past credibility.
// ─────────────────────────────────────────────────────────────────────────────

import type { CodingAssumptions, Ranged, ScenarioAssumptions } from "@/lib/types";
import { add, exact, mul, scale } from "./ranged";
import { interpolateRamp } from "./ramp";
import { DEFAULT_VALUE_REALIZATION } from "@/lib/data/defaults";

/** Working hours per engineer-year (gross). Editable constant; never a model
 *  name. ~2,080 = 40 hrs × 52 wks before PTO. */
export const HOURS_PER_YEAR = 2080;

export interface CodingResult {
  /** Gross freed engineering hours/yr at this ramp point (the physical input). */
  freedHours: Ranged;
  /** Realized engineering cost-out value (the `allocation` share). */
  costSavings: Ranged;
  /** Realized revenue-growth value (the `1 − allocation` share). */
  revenueGrowth: Ranged;
  /** costSavings + revenueGrowth — the figure that folds into the headline. */
  total: Ranged;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * This year's adoption breadth ÷ the final year's (on base). Coding value ramps
 * in lockstep with the rest of the deck (Y1 < … < final) instead of landing at
 * full maturity on day one. Base-driven scalar — the band comes from the
 * uncertain inputs (efficiency, rate, growth), not from compounding the ramp.
 */
function rampRatio(a: ScenarioAssumptions, year: number): number {
  const finalBreadth = interpolateRamp(a.adoptionBreadth, a.horizonYears).base;
  if (finalBreadth <= 0) return 0;
  return interpolateRamp(a.adoptionBreadth, year).base / finalBreadth;
}

/** Gross freed engineering hours/yr at a (fractional) year. Banded on the
 *  efficiency gain only. */
export function codingFreedHours(
  c: CodingAssumptions,
  a: ScenarioAssumptions,
  year: number,
): Ranged {
  const matureHours = c.coders * HOURS_PER_YEAR * clamp01(c.timeOnCodePct);
  return scale(c.efficiencyGain, Math.max(0, matureHours) * rampRatio(a, year));
}

/**
 * Coding value at a (fractional) year, split by the allocation slider and
 * haircut by the same realization factors as the bottom-up value.
 */
export function codingValue(
  c: CodingAssumptions,
  a: ScenarioAssumptions,
  year: number,
): CodingResult {
  const alloc = clamp01(c.allocation);
  const offsetR = a.offsetRealization ?? DEFAULT_VALUE_REALIZATION.offset;
  const capacityR = a.capacityRealization ?? DEFAULT_VALUE_REALIZATION.capacity;

  const freedHours = codingFreedHours(c, a, year);

  // Path A — engineering cost-out: freed hours × loaded $/hr × offset realization.
  const costSavings = scale(
    mul(mul(freedHours, c.engineeringLoadedCost), offsetR),
    alloc,
  );

  // Path B — revenue growth: incremental topline from a fixed relative step-up
  // (×stepUp on the baseline rate), capacity-realized and ramped. Not compounded.
  const upliftRevenue = mul(
    c.topline,
    scale(c.growthBaseline, Math.max(0, c.growthStepUp - 1)),
  );
  const revenueGrowth = scale(
    mul(upliftRevenue, capacityR),
    (1 - alloc) * rampRatio(a, year),
  );

  return {
    freedHours,
    costSavings,
    revenueGrowth,
    total: add(costSavings, revenueGrowth),
  };
}

const zero = (): CodingResult => ({
  freedHours: exact(0),
  costSavings: exact(0),
  revenueGrowth: exact(0),
  total: exact(0),
});

/** Year-1 and final-year coding figures for a context's assumptions. Returns
 *  zeros when assumptions.coding is absent (pre-feature payloads stay finite and
 *  the headline is unchanged). */
export function codingFigures(a: ScenarioAssumptions): {
  y1: CodingResult;
  finalYear: CodingResult;
} {
  if (!a.coding) return { y1: zero(), finalYear: zero() };
  return {
    y1: codingValue(a.coding, a, 1),
    finalYear: codingValue(a.coding, a, a.horizonYears),
  };
}
