import type { RampPoint, Ranged } from "@/lib/types";

/**
 * Linear interpolation over RampPoint[], independently per band edge
 * (low/base/high). Clamps at the endpoints. Accepts fractional years so
 * break-even can sample monthly (year = month / 12).
 *
 * Points are assumed user-authored per integer year (1, 2, 3, …) but any
 * ascending fractional years work.
 */
export function interpolateRamp(points: RampPoint[], year: number): Ranged {
  if (points.length === 0) return { low: 0, base: 0, high: 0 };

  const sorted = [...points].sort((a, b) => a.year - b.year);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (year <= first.year) return { low: first.low, base: first.base, high: first.high };
  if (year >= last.year) return { low: last.low, base: last.base, high: last.high };

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return {
        low: a.low + t * (b.low - a.low),
        base: a.base + t * (b.base - a.base),
        high: a.high + t * (b.high - a.high),
      };
    }
  }
  // Unreachable given the clamps above, but keeps the return type total.
  return { low: last.low, base: last.base, high: last.high };
}
