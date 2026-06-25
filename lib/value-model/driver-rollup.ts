// ─────────────────────────────────────────────────────────────────────────────
// Shared per-driver / per-outcome rollup. The Value Map and the financial-
// statement rollup both need the same base-case driver and outcome totals that
// the Business Value section computes inline — this is the single source so they
// can never drift from the headline. Mirrors business-value.ts:
//   • use-case value rolled to drivers (bottom_up) OR the sector-weighted split
//     of the top-down total, PLUS the folded coding + IT-takeout drivers;
//   • routed to financial outcomes by the reinvestment posture, with coding's
//     two halves and the IT takeout added straight to revenue / margin.
// sum(perOutcomeValues) == business_value base (guarded in check-sections).
// ─────────────────────────────────────────────────────────────────────────────

import type { ProposalContext } from "@/lib/types";
import {
  rollupUseCasesToDrivers,
  routeToOutcomes,
  type DriverId,
  type OutcomeId,
} from "./drivers";
import { annualValueByUseCase } from "@/lib/economics/engine";
import { topDownPerUseCase } from "@/lib/economics/top-down";
import { codingFigures } from "@/lib/economics/coding";
import { itTakeoutFigures } from "@/lib/economics/it-takeout";

function capacityShare(ctx: ProposalContext): number {
  const v = ctx.assumptions.reinvestmentCapacity;
  return typeof v === "number" ? Math.min(1, Math.max(0, v)) : 0.6;
}

/** Use-case driver rollup (final-year base), WITHOUT the folded coding / IT
 *  takeout drivers — the part that routes through the reinvestment posture. */
function useCaseDrivers(ctx: ProposalContext): Record<DriverId, number> {
  const a = ctx.assumptions;
  if ((a.valueApproach ?? "bottom_up") === "top_down") {
    // Top-down: break the directional envelope across the selected use cases by
    // tier, then roll to drivers (carries each use case's custom mapping).
    return rollupUseCasesToDrivers(topDownPerUseCase(ctx.valueModel, ctx.selectedUseCases));
  }
  const byUseCase = annualValueByUseCase(a, ctx.selectedUseCases, a.horizonYears);
  return rollupUseCasesToDrivers(
    byUseCase.map(({ useCase, value }) => ({
      id: useCase.id,
      value: value.base,
      drivers: useCase.drivers,
    })),
  );
}

/** Per-driver final-year value (base), including the folded coding + IT-takeout
 *  drivers. Sum equals the Business Value headline base. */
export function perDriverValues(ctx: ProposalContext): Record<DriverId, number> {
  const perDriver = useCaseDrivers(ctx);
  const coding = codingFigures(ctx.assumptions).finalYear;
  const itTakeout = itTakeoutFigures(ctx.assumptions).finalYear;
  perDriver.coding_efficiency += coding.total.base;
  perDriver.it_takeout += itTakeout.takeout.base;
  return perDriver;
}

/** Per-outcome final-year value (base): revenue / margin / loss_avoidance,
 *  including coding (split by its allocation) and the IT takeout (→ margin).
 *  Sum equals the Business Value headline base. */
export function perOutcomeValues(ctx: ProposalContext): Record<OutcomeId, number> {
  const out = routeToOutcomes(useCaseDrivers(ctx), capacityShare(ctx));
  const coding = codingFigures(ctx.assumptions).finalYear;
  const itTakeout = itTakeoutFigures(ctx.assumptions).finalYear;
  out.margin += coding.costSavings.base; // engineering cost-out
  out.revenue += coding.revenueGrowth.base; // reinvested capacity → growth
  out.margin += itTakeout.takeout.base; // legacy run-rate eliminated
  return out;
}
