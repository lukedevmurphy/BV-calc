// ─────────────────────────────────────────────────────────────────────────────
// IT cost takeout / legacy application rationalization driver. Decommissioning
// legacy apps and infrastructure on a sunset schedule eliminates recurring run-
// rate cost. `sunsetByYear` is the CUMULATIVE annual cost eliminated by each
// horizon year ($); the realized takeout in year N is that figure × realization
// (execution risk on the plan). Opt-in (enabled flag) — zero when off.
//
// Like the coding driver, this is a value-direction cost-out: it folds into the
// Business Value headline and routes to operating margin. It is NOT in the
// engine's monthlyValue/break-even spine (those stay use-case-only).
// ─────────────────────────────────────────────────────────────────────────────

import type { ItTakeoutAssumptions, Ranged, ScenarioAssumptions } from "@/lib/types";
import { exact, scale } from "./ranged";

export interface ItTakeoutResult {
  /** Planned cumulative annual run-rate eliminated by this year (pre-realization). */
  gross: number;
  /** Realized takeout = gross × realization (the figure that folds into value). */
  takeout: Ranged;
}

/**
 * Cumulative annual run-rate eliminated by an integer year. The schedule is
 * cumulative and non-decreasing by intent; an unentered (or lower) later year
 * carries the highest entered value for years ≤ it forward — a sunset, once
 * done, stays done.
 */
export function itTakeoutGrossAtYear(t: ItTakeoutAssumptions, year: number): number {
  if (!t.enabled) return 0;
  let carried = 0;
  for (let y = 1; y <= year; y++) {
    const v = t.sunsetByYear[String(y)];
    if (typeof v === "number" && Number.isFinite(v) && v > carried) carried = v;
  }
  return carried;
}

export function itTakeoutValueAtYear(
  t: ItTakeoutAssumptions,
  year: number,
): ItTakeoutResult {
  const gross = itTakeoutGrossAtYear(t, year);
  return { gross, takeout: scale(t.realization, gross) };
}

const zero = (): ItTakeoutResult => ({ gross: 0, takeout: exact(0) });

/** Year-1 and final-year IT takeout figures. Zeros when absent or disabled. */
export function itTakeoutFigures(a: ScenarioAssumptions): {
  y1: ItTakeoutResult;
  finalYear: ItTakeoutResult;
} {
  const t = a.itTakeout;
  if (!t || !t.enabled) return { y1: zero(), finalYear: zero() };
  return {
    y1: itTakeoutValueAtYear(t, 1),
    finalYear: itTakeoutValueAtYear(t, a.horizonYears),
  };
}
