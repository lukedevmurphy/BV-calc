// Shared formatting — sections build display strings through these helpers so
// the web preview and the .pptx export show byte-identical text.

import type { Ranged } from "@/lib/types";

export function fmtCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign(n)}$${fmt1(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign(n)}$${fmt1(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign(n)}$${fmt1(abs / 1e3)}K`;
  return `${sign(n)}$${Math.round(abs).toLocaleString("en-US")}`;
}

/** For sub-dollar unit prices (e.g. blended $/task) where compact rounding
 *  would show $0. */
export function fmtCurrencySmall(n: number): string {
  const decimals = Math.abs(n) < 0.1 ? 3 : 2;
  return `${sign(n)}$${Math.abs(n).toFixed(decimals)}`;
}

export function fmtNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${sign(n)}${fmt1(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign(n)}${fmt1(abs / 1e3)}K`;
  return `${sign(n)}${Math.round(abs).toLocaleString("en-US")}`;
}

export function fmtPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export type Formatter = (n: number) => string;

/** "base (low–high)" — base-forward, range auditable at a glance. */
export function fmtRange(r: Ranged, fmt: Formatter = fmtCurrency): string {
  return `${fmt(r.base)} (${fmt(r.low)}–${fmt(r.high)})`;
}

/** "low – base – high" for table cells where all three carry equal weight. */
export function fmtRangeTriple(r: Ranged, fmt: Formatter = fmtCurrency): string {
  return `${fmt(r.low)} / ${fmt(r.base)} / ${fmt(r.high)}`;
}

/** "month 7 (4–14)" style for break-even periods; null = beyond horizon. */
export function fmtMonth(m: number | null): string {
  return m === null ? "beyond horizon" : `month ${m}`;
}

const sign = (n: number) => (n < 0 ? "-" : "");
// Two significant figures within a B/M/K bucket: [1,10) keeps one decimal,
// [10,1000) rounds to an integer. Kills false precision ($86.3K → $86K,
// $39.6K → $40K, $4.23M → $4.2M) so a column of values reads cleanly.
const fmt1 = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));
