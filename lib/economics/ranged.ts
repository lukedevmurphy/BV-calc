import type { Ranged } from "@/lib/types";

export const ranged = (low: number, base: number, high: number): Ranged => ({
  low,
  base,
  high,
});

export const exact = (n: number): Ranged => ({ low: n, base: n, high: n });

/**
 * Element-wise low-low / base-base / high-high. Correct ONLY when both inputs
 * move the output in the SAME direction (value×value, cost×cost). For
 * value-vs-cost comparisons use netVsCost/ratioVsCost below.
 */
export const map2 = (
  a: Ranged,
  b: Ranged,
  f: (x: number, y: number) => number,
): Ranged => ({
  low: f(a.low, b.low),
  base: f(a.base, b.base),
  high: f(a.high, b.high),
});

export const mul = (a: Ranged, b: Ranged): Ranged => map2(a, b, (x, y) => x * y);
export const add = (a: Ranged, b: Ranged): Ranged => map2(a, b, (x, y) => x + y);

export const scale = (a: Ranged, k: number): Ranged => ({
  low: a.low * k,
  base: a.base * k,
  high: a.high * k,
});

export const sum = (xs: Ranged[]): Ranged => xs.reduce(add, exact(0));

/**
 * Build a confidence band of ±`halfWidthPct` around a central estimate. Used
 * by the value-approach slider: each approach reports a band that reflects its
 * METHODOLOGICAL confidence (top_down coarse → wide, bottom_up granular →
 * tight) rather than the engine's mechanical multiplicative compounding (which,
 * counter-intuitively, widens most for the most-detailed build). The base is
 * the meaningful figure and is preserved exactly; only the spread is set here.
 */
export const bandAroundBase = (base: number, halfWidthPct: number): Ranged => ({
  low: base * (1 - halfWidthPct),
  base,
  high: base * (1 + halfWidthPct),
});

/**
 * THE PAIRING SUBTLETY — value minus cost. The conservative ("low") outcome is
 * LOW value AND HIGH cost; the optimistic ("high") outcome is high value and
 * low cost. Element-wise map2 would be wrong here (it understates the spread
 * and overstates the conservative case). This is the only anti-paired
 * operation — it lives here so section modules can't hand-roll it wrong.
 */
export const netVsCost = (value: Ranged, cost: Ranged): Ranged => ({
  low: value.low - cost.high, // conservative
  base: value.base - cost.base,
  high: value.high - cost.low, // optimistic
});

/** Same anti-pairing for ROI = value / cost. Guards division by zero so NaN
 *  and Infinity never leak into JSON (stringify silently nulls them). */
export const ratioVsCost = (value: Ranged, cost: Ranged): Ranged => ({
  low: safeDiv(value.low, cost.high),
  base: safeDiv(value.base, cost.base),
  high: safeDiv(value.high, cost.low),
});

const safeDiv = (n: number, d: number): number => (d === 0 ? 0 : n / d);

/**
 * Plausibility ceiling for the headline value-to-cost ratio. A credible AI
 * business case lands in low-single to low-double-digit ROI; a 100×+ ratio
 * signals cost understated or value overstated. Above this, surface a WARNING
 * instead of a hero number that destroys credibility with a CFO.
 */
export const RATIO_CEILING = 30;

export const ratioPlausible = (ratioBase: number): boolean =>
  ratioBase <= RATIO_CEILING;
