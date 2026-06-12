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

// Fallbacks for use cases that ship without sizing knobs, so the engine stays
// total. Seeded use cases always carry explicit values.
const FALLBACK_HOURS_SAVED: Ranged = ranged(0.25, 0.5, 1);
const FALLBACK_INSTANCES_PER_MONTH: Ranged = ranged(1, 2, 4);

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

/** Blended $/task from the user-editable model mix. */
export function blendedPricePerTask(a: ScenarioAssumptions): number {
  const { input, output } = a.avgTokensPerTask;
  return a.modelMix.reduce(
    (acc, m) =>
      acc +
      (m.sharePct / 100) *
        ((input * m.inputPricePerMTok + output * m.outputPricePerMTok) / 1e6),
    0,
  );
}

/** Monthly consumption cost at a point in time (year may be fractional). */
export function monthlyCost(a: ScenarioAssumptions, year: number): Ranged {
  const volume = mul(
    mul(activeUsersAtYear(a, year), depthAtYear(a, year)),
    a.avgTasksPerActiveUserPerMonth,
  );
  return scale(volume, blendedPricePerTask(a));
}

/** Annual consumption cost for a given (integer) year of the ramp. */
export function annualTokenCost(a: ScenarioAssumptions, year: number): Ranged {
  return scale(monthlyCost(a, year), 12);
}

/** Monthly bottom-up value across selected use cases at a point in time. */
export function monthlyValue(
  a: ScenarioAssumptions,
  useCases: UseCase[],
  year: number,
): Ranged {
  const users = activeUsersAtYear(a, year);
  const depth = depthAtYear(a, year);
  return sum(
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
  const cost = years.map((y) => ({ x: `Year ${y}`, ...annualTokenCost(a, y) }));
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
    cumCost = sumPair(cumCost, monthlyCost(a, midYear));

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
  const matureDepth = depthAtYear(a, a.horizonYears);
  const tasks = a.avgTasksPerActiveUserPerMonth;
  const price = blendedPricePerTask(a);

  return Array.from({ length: steps + 1 }, (_, i) => {
    const breadth = i / steps;
    const users = exact(a.targetUserCount * breadth);
    const cost = scale(mul(mul(users, matureDepth), tasks), price * 12);
    const value = scale(
      sum(
        useCases.map((uc) =>
          mul(
            mul(
              mul(
                uc.hoursSavedPerInstance ?? FALLBACK_HOURS_SAVED,
                uc.instancesPerMonthPerUser ?? FALLBACK_INSTANCES_PER_MONTH,
              ),
              a.loadedHourlyCost,
            ),
            mul(matureDepth, users),
          ),
        ),
      ),
      12,
    );
    return { breadth, cost, value };
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
  const matureDepth = depthAtYear(a, a.horizonYears);
  for (let i = 0; i <= steps; i++) {
    const breadth = i / steps;
    const users = a.targetUserCount * breadth;
    const cost =
      users * matureDepth.base * a.avgTasksPerActiveUserPerMonth.base *
      blendedPricePerTask(a) * 12;
    const value =
      useCases.reduce((acc, uc) => {
        const h = (uc.hoursSavedPerInstance ?? FALLBACK_HOURS_SAVED).base;
        const inst = (uc.instancesPerMonthPerUser ?? FALLBACK_INSTANCES_PER_MONTH).base;
        return acc + h * inst * a.loadedHourlyCost.base;
      }, 0) *
      matureDepth.base * users * 12;
    if (value >= cost + amortized) return breadth;
  }
  return null;
}
