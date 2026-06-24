// ─────────────────────────────────────────────────────────────────────────────
// The formula spine. cost / business_value / forecast sections all import
// from here and never reimplement ramp math.
//
// COST SPINE:
//   cost = activeUsers(breadth) × tasksPerUser × depth × tokensPerTask
//          × pricePerToken(modelMix), integrated over the horizon
//
// VALUE SPINE (bottom-up from selected use cases, never top-down %):
//   value = Σ_useCases hoursSavedPerInstance × loadedHourlyCost
//           × instancesPerMonthPerUser × depth × activeUsers, per month
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BandedSeries,
  Ranged,
  ScenarioAssumptions,
  UseCase,
} from "@/lib/types";
import { exact, mul, netVsCost, ranged, scale, sum } from "./ranged";
import { interpolateRamp } from "./ramp";
import { tokenDefaultFor } from "@/lib/data/token-defaults";
import {
  DEFAULT_USE_CASE_COVERAGE,
  DEFAULT_VALUE_REALIZATION,
} from "@/lib/data/defaults";

// Fallbacks for use cases that ship without sizing knobs, so the engine stays
// total. Seeded use cases always carry explicit values.
const FALLBACK_HOURS_SAVED: Ranged = ranged(0.25, 0.5, 1);
const FALLBACK_INSTANCES_PER_MONTH: Ranged = ranged(1, 2, 4);

// ── Value-realism: turn raw saved-hours into realized dollars ────────────────
// The bottom-up sum is a GROSS, full-freight figure: every saved hour valued at
// the loaded rate, for every adopter, on every selected use case. Two honest
// haircuts turn it into a defensible dollar value — both move value the SAME
// direction (more realization / more coverage → more value), so element-wise
// mul/scale is correct here (this is NOT an anti-paired value-vs-cost op).

/**
 * Effective fraction of saved-hours value realized as dollars, blended by the
 * reinvestment posture. CAPACITY realizes LESS than OFFSET, so moving the toggle
 * moves the TOTAL value (not just its composition). Ranged because realization
 * itself is uncertain. Pre-feature payloads fall back to the published defaults.
 */
export function valueRealization(a: ScenarioAssumptions): Ranged {
  const cap = clamp01(a.reinvestmentCapacity ?? 0.6);
  const off = a.offsetRealization ?? DEFAULT_VALUE_REALIZATION.offset;
  const capR = a.capacityRealization ?? DEFAULT_VALUE_REALIZATION.capacity;
  return {
    low: cap * capR.low + (1 - cap) * off.low,
    base: cap * capR.base + (1 - cap) * off.base,
    high: cap * capR.high + (1 - cap) * off.high,
  };
}

/** Persona-coverage scalar — share of selected workflows a typical adopter runs. */
export const useCaseCoverage = (a: ScenarioAssumptions): number =>
  clamp01(a.useCaseCoverage ?? DEFAULT_USE_CASE_COVERAGE);

/** Combined value-realism multiplier on raw saved-hours value (base edge), for
 *  the per-year helpers below that only track base. */
const valueRealismBase = (a: ScenarioAssumptions): number =>
  useCaseCoverage(a) * valueRealization(a).base;

// Cost levers — sourceable discounts (June 2026): cached input ≈90% cheaper,
// Batch API ≈50% off. The HIT RATIO / BATCH SHARE they apply to are user
// assumptions; these discount magnitudes are the published rates.
export const CACHED_INPUT_DISCOUNT = 0.9;
export const BATCH_DISCOUNT = 0.5;
const clamp01 = (x: number | undefined) => Math.min(1, Math.max(0, x ?? 0));

const instancesBase = (uc: UseCase) =>
  (uc.instancesPerMonthPerUser ?? FALLBACK_INSTANCES_PER_MONTH).base;

/** Dimension 1 (breadth): how many people are active at a point in time. */
export function activeUsersAtYear(
  a: ScenarioAssumptions,
  year: number,
): Ranged {
  return scale(interpolateRamp(a.adoptionBreadth, year), a.targetUserCount);
}

/**
 * Dimension 2 (depth): consumption intensity per adopter. Multiplies BOTH
 * task volume (cost driver) and use-case instance volume (value driver),
 * keeping the two-dimensional ramp consistent across sections.
 */
export function depthAtYear(a: ScenarioAssumptions, year: number): Ranged {
  return interpolateRamp(a.usageDepth, year);
}

/** Per-use-case token volumes — the user's override, else the catalog default. */
export function tokensForUseCase(
  a: ScenarioAssumptions,
  uc: UseCase,
): { input: Ranged; output: Ranged } {
  const o = a.tokenOverrides?.[uc.id];
  if (o) return o;
  const d = tokenDefaultFor(uc.id);
  return { input: d.input, output: d.output };
}

/** Effective $/token after the prompt-cache discount on the hit fraction. */
const inputUnit = (a: ScenarioAssumptions, m: ScenarioAssumptions["modelMix"][number]) =>
  (m.inputPricePerMTok / 1e6) * (1 - clamp01(a.cacheHitRatio) * CACHED_INPUT_DISCOUNT);
const outputUnit = (m: ScenarioAssumptions["modelMix"][number]) => m.outputPricePerMTok / 1e6;

/**
 * Cost of ONE instance of a use case ($), banded by its token range and blended
 * over the model mix, with prompt-caching and Batch discounts applied. The band
 * width comes from the TOKEN (implementation-strategy) range — NOT from
 * compounding adoption × depth × instances — which keeps the cost band sane.
 */
export function costPerTask(a: ScenarioAssumptions, uc: UseCase): Ranged {
  const tok = tokensForUseCase(a, uc);
  const batchMult = 1 - clamp01(a.batchShare) * BATCH_DISCOUNT;
  let low = 0, base = 0, high = 0;
  for (const m of a.modelMix) {
    const share = (m.sharePct || 0) / 100;
    const iu = inputUnit(a, m) * batchMult;
    const ou = outputUnit(m) * batchMult;
    low += share * (tok.input.low * iu + tok.output.low * ou);
    base += share * (tok.input.base * iu + tok.output.base * ou);
    high += share * (tok.input.high * iu + tok.output.high * ou);
  }
  return { low, base, high };
}

/** Representative blended $/task across the selected use cases (base), display. */
export function avgCostPerTask(a: ScenarioAssumptions, useCases: UseCase[]): number {
  if (useCases.length === 0) return 0;
  return useCases.reduce((s, uc) => s + costPerTask(a, uc).base, 0) / useCases.length;
}

/** Blended list $/MTok across the model mix (pre-caching), for display. */
export const blendedInputPricePerMTok = (a: ScenarioAssumptions) =>
  a.modelMix.reduce((s, m) => s + (m.sharePct / 100) * m.inputPricePerMTok, 0);
export const blendedOutputPricePerMTok = (a: ScenarioAssumptions) =>
  a.modelMix.reduce((s, m) => s + (m.sharePct / 100) * m.outputPricePerMTok, 0);

/**
 * Monthly consumption cost at a point in time. Sums the SAME per-use-case
 * instance volumes that drive value (so every value-creating task also incurs
 * token cost) × per-use-case cost-per-task. Adoption/depth/instances are taken
 * at base; the band is the token-strategy spread (see costPerTask).
 */
export function monthlyCost(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): Ranged {
  const users = activeUsersAtYear(a, year).base;
  const depth = depthAtYear(a, year).base;
  let low = 0, base = 0, high = 0;
  for (const uc of useCases) {
    const vol = users * depth * instancesBase(uc);
    const cpt = costPerTask(a, uc);
    low += vol * cpt.low;
    base += vol * cpt.base;
    high += vol * cpt.high;
  }
  return { low, base, high };
}

/** Annual consumption cost for a given (integer) year of the ramp. */
export function annualTokenCost(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): Ranged {
  const override = a.annualCostOverrides?.[String(Math.round(year))];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return exact(override);
  }
  return scale(monthlyCost(a, useCases, year), 12);
}

/** Monthly bottom-up value across selected use cases at a point in time —
 *  REALIZATION-ADJUSTED, not raw saved time. The gross saved-hours value is
 *  haircut by persona coverage (a typical adopter runs only a subset of the
 *  selected workflows) and by the posture-blended realization rate (freed hours
 *  become dollars only partially, and capacity realizes less than offset). */
export function monthlyValue(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): Ranged {
  const users = activeUsersAtYear(a, year);
  const depth = depthAtYear(a, year);
  const gross = sum(
    useCases.map((uc) => {
      const perUserPerMonth = mul(
        mul(
          uc.hoursSavedPerInstance ?? FALLBACK_HOURS_SAVED,
          uc.instancesPerMonthPerUser ?? FALLBACK_INSTANCES_PER_MONTH,
        ),
        a.loadedHourlyCost,
      );
      return mul(mul(perUserPerMonth, depth), users);
    }),
  );
  // coverage (scalar) × realization (ranged) — both value-direction, so scale/mul.
  return scale(mul(gross, valueRealization(a)), useCaseCoverage(a));
}

export function annualValue(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): Ranged {
  return scale(monthlyValue(a, useCases, year), 12);
}

/** Per-use-case breakdown for the business_value table. */
export function annualValueByUseCase(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): { useCase: UseCase; value: Ranged }[] {
  return useCases.map((uc) => ({
    useCase: uc,
    value: annualValue(a, [uc], year),
  }));
}

/**
 * One call yields both banded funnels for the forecast (plus net). The funnel
 * shape emerges naturally: ramp bands are user-authored to widen over years
 * and multiplicative Ranged terms compound.
 *
 * `net` uses netVsCost per point — band edges anti-paired (conservative =
 * low value minus high cost). Cost here is consumption only; the one-time
 * implementationCost is handled in break-even and cumulative views.
 */
export function yearlySeries(
  a: ScenarioAssumptions,
  useCases: UseCase[],
): { value: BandedSeries; cost: BandedSeries; net: BandedSeries } {
  const years = Array.from({ length: a.horizonYears }, (_, i) => i + 1);
  const value = years.map((y) => ({ x: `Year ${y}`, ...annualValue(a, useCases, y) }));
  const cost = years.map((y) => ({ x: `Year ${y}`, ...annualTokenCost(a, useCases, y) }));
  const net = years.map((y, i) => ({
    x: `Year ${y}`,
    ...netVsCost(value[i], cost[i]),
  }));
  return {
    value: { name: "Annual value", points: value, format: "currency" },
    cost: { name: "Annual cost", points: cost, format: "currency" },
    net: { name: "Net value", points: net, format: "currency" },
  };
}

/**
 * Break-even period: first month where cumulative value ≥ implementationCost
 * + cumulative consumption cost. Scanned monthly over the horizon.
 *
 * Anti-paired edges: the conservative ("low") break-even compares cumulative
 * value.low against implementation.high + cost.high (latest crossing); the
 * optimistic ("high") edge compares value.high against the low costs
 * (earliest crossing). null = never crosses within the horizon.
 */
export interface BreakEven {
  low: number | null;
  base: number | null;
  high: number | null;
}

export function breakEvenMonth(
  a: ScenarioAssumptions,
  useCases: UseCase[],
): BreakEven {
  const months = a.horizonYears * 12;
  let cumValue = exact(0);
  let cumCost = exact(0);
  const result: BreakEven = { low: null, base: null, high: null };

  for (let m = 1; m <= months; m++) {
    const midYear = (m - 0.5) / 12; // sample mid-month
    cumValue = sumPair(cumValue, monthlyValue(a, useCases, midYear));
    cumCost = sumPair(cumCost, monthlyCost(a, useCases, midYear));

    if (result.low === null && cumValue.low >= cumCost.high + a.implementationCost.high) {
      result.low = m;
    }
    if (result.base === null && cumValue.base >= cumCost.base + a.implementationCost.base) {
      result.base = m;
    }
    if (result.high === null && cumValue.high >= cumCost.low + a.implementationCost.low) {
      result.high = m;
    }
    if (result.low !== null && result.base !== null && result.high !== null) break;
  }
  return result;
}

const sumPair = (a: Ranged, b: Ranged): Ranged => ({
  low: a.low + b.low,
  base: a.base + b.base,
  high: a.high + b.high,
});

/**
 * Adoption-axis view for the cost section: sample annual cost & value across
 * breadth fractions 0..1 at mature (final-year) depth. Makes the consumption
 * truth explicit — higher adoption raises cost — and locates the adoption
 * level where annual value covers annual cost plus the amortized
 * implementation cost.
 */
export function costValueByAdoption(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  steps = 10,
): { breadth: number; cost: Ranged; value: Ranged }[] {
  const matureDepth = depthAtYear(a, a.horizonYears).base;
  const realism = valueRealismBase(a); // coverage × realization (base)

  return Array.from({ length: steps + 1 }, (_, i) => {
    const breadth = i / steps;
    const users = a.targetUserCount * breadth;
    let cLow = 0, cBase = 0, cHigh = 0, value = 0;
    for (const uc of useCases) {
      const inst = instancesBase(uc);
      const vol = users * matureDepth * inst * 12;
      const cpt = costPerTask(a, uc);
      cLow += vol * cpt.low;
      cBase += vol * cpt.base;
      cHigh += vol * cpt.high;
      const h = (uc.hoursSavedPerInstance ?? FALLBACK_HOURS_SAVED).base;
      // Value is realization-adjusted (same haircut as monthlyValue); cost is not.
      value += h * inst * a.loadedHourlyCost.base * matureDepth * users * 12 * realism;
    }
    return { breadth, cost: { low: cLow, base: cBase, high: cHigh }, value: exact(value) };
  });
}

/**
 * Smallest adoption breadth (0..1, or null) where mature-year annual value
 * covers annual consumption cost plus the implementation cost amortized over
 * the horizon. Compared on base values.
 */
export function breakEvenAdoption(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  steps = 100,
): number | null {
  const amortized = a.implementationCost.base / a.horizonYears;
  const matureDepth = depthAtYear(a, a.horizonYears).base;
  const realism = valueRealismBase(a); // coverage × realization (base)
  for (let i = 0; i <= steps; i++) {
    const breadth = i / steps;
    const users = a.targetUserCount * breadth;
    let cost = 0, value = 0;
    for (const uc of useCases) {
      const inst = instancesBase(uc);
      cost += users * matureDepth * inst * costPerTask(a, uc).base * 12;
      const h = (uc.hoursSavedPerInstance ?? FALLBACK_HOURS_SAVED).base;
      value += h * inst * a.loadedHourlyCost.base * matureDepth * users * 12 * realism;
    }
    if (value >= cost + amortized) return breadth;
  }
  return null;
}
