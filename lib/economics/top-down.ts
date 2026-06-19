import type { Ranged, ScenarioAssumptions, ValueModelInputs } from "@/lib/types";
import { bandAroundBase, exact } from "./ranged";
import { interpolateRamp } from "./ramp";
import { APPROACH_BAND_HALF_WIDTH_PCT } from "@/lib/value-model/constants";

export function topDownMatureValue(vm: ValueModelInputs): number {
  return (
    vm.topline.base *
    vm.addressableShare.base *
    vm.upliftPct.base *
    vm.realizationFactor.base
  );
}

export function annualTopDownCost(vm: ValueModelInputs, year: number): Ranged {
  const cost = vm.topDownAnnualCosts[String(Math.round(year))];
  return exact(typeof cost === "number" && Number.isFinite(cost) && cost > 0 ? cost : 0);
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
