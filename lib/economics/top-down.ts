import type {
  Ranged,
  ScenarioAssumptions,
  UseCase,
  ValueModelInputs,
} from "@/lib/types";
import type { DriverId } from "@/lib/value-model/drivers";
import { bandAroundBase, exact } from "./ranged";
import { interpolateRamp } from "./ramp";
import { APPROACH_BAND_HALF_WIDTH_PCT } from "@/lib/value-model/constants";

/** Top-down value tiers → relative allocation weights. */
const TIER_WEIGHT: Record<NonNullable<UseCase["topDownTier"]>, number> = {
  high: 3,
  med: 2,
  low: 1,
};

/** AI-driven revenue-growth uplift as a fraction of revenue: the lifted growth
 *  rate minus the baseline. The intuitive low-data SWAG ("AI lifts growth from
 *  10% to 12%"). Falls back to 0 when the growth inputs are absent. */
export function topDownGrowthUplift(vm: ValueModelInputs): number {
  const baseline = vm.topDownGrowthBaseline ?? 0;
  const lifted = vm.topDownGrowthLifted ?? baseline;
  return Math.max(0, lifted - baseline);
}

/**
 * Mature (steady-state) directional value. Use-case-driven SWAG:
 *   topline × (lifted growth rate − baseline) × realization
 * Falls back to the legacy addressable × uplift envelope only when the growth
 * inputs are absent (pre-migration payloads).
 */
export function topDownMatureValue(vm: ValueModelInputs): number {
  if (vm.topDownGrowthLifted !== undefined || vm.topDownGrowthBaseline !== undefined) {
    return vm.topline * topDownGrowthUplift(vm) * vm.realizationFactor.base;
  }
  return (
    vm.topline *
    vm.addressableShare.base *
    vm.upliftPct.base *
    vm.realizationFactor.base
  );
}

/**
 * Break the directional envelope across the selected use cases by value tier
 * (High=3 / Med=2 / Low=1; explicit per-id weights win). Totals-preserving:
 * Σ value === topDownMatureValue(vm), so the headline and the value_map /
 * financial_rollup tie-outs hold. Carries each use case's `drivers` so the
 * driver rollup picks up custom mappings.
 */
export function topDownPerUseCase(
  vm: ValueModelInputs,
  useCases: UseCase[],
): { id: string; value: number; drivers?: DriverId[] }[] {
  const total = topDownMatureValue(vm);
  if (useCases.length === 0) return [];
  const weightFor = (uc: UseCase): number => {
    const explicit = vm.topDownUseCaseWeights?.[uc.id];
    if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
      return explicit;
    }
    return TIER_WEIGHT[uc.topDownTier ?? "med"];
  };
  const raw = useCases.map(weightFor);
  const sum = raw.reduce((s, x) => s + x, 0) || useCases.length;
  return useCases.map((uc, i) => ({
    id: uc.id,
    value: total * (raw[i] / sum),
    drivers: uc.drivers,
  }));
}

export function annualTopDownCost(vm: ValueModelInputs, year: number): Ranged {
  const cost = vm.topDownAnnualCosts[String(Math.round(year))];
  const base = typeof cost === "number" && Number.isFinite(cost) && cost > 0 ? cost : 0;
  return base > 0 ? bandAroundBase(base, 0.25) : exact(0);
}

export function annualTopDownValue(
  assumptions: ScenarioAssumptions,
  vm: ValueModelInputs,
  year: number,
): Ranged {
  const finalYear = assumptions.horizonYears;
  const finalBreadth = interpolateRamp(assumptions.adoptionBreadth, finalYear).base;
  const yearBreadth = interpolateRamp(assumptions.adoptionBreadth, year).base;
  const ratio = finalBreadth > 0 ? yearBreadth / finalBreadth : 1;
  return bandAroundBase(
    topDownMatureValue(vm) * ratio,
    APPROACH_BAND_HALF_WIDTH_PCT.top_down,
  );
}
