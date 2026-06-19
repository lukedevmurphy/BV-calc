// Step-1 verification: exercise the economics engine and assert its
// invariants. Run with `npx tsx scripts/check-engine.ts`.

import assert from "node:assert";
import { DEFAULT_ASSUMPTIONS } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import {
  annualTokenCost,
  annualValue,
  avgCostPerTask,
  breakEvenAdoption,
  breakEvenMonth,
  costValueByAdoption,
  yearlySeries,
} from "@/lib/economics/engine";
import { netVsCost, ratioVsCost, ratioPlausible } from "@/lib/economics/ranged";
import { fmtCurrency, fmtRange } from "@/lib/format";

const a = DEFAULT_ASSUMPTIONS;
const ucs = SEED_USE_CASES.slice(0, 4);

console.log(`avg blended $/task: $${avgCostPerTask(a, ucs).toFixed(4)}`);

for (const year of [1, 2, 3]) {
  const cost = annualTokenCost(a, ucs, year);
  const value = annualValue(a, ucs, year);
  const net = netVsCost(value, cost);
  console.log(
    `Y${year}  cost ${fmtRange(cost)}  value ${fmtRange(value)}  net ${fmtRange(net)}`,
  );
  // Band ordering invariants
  assert(cost.low <= cost.base && cost.base <= cost.high, `Y${year} cost ordering`);
  assert(value.low <= value.base && value.base <= value.high, `Y${year} value ordering`);
  assert(net.low <= net.base && net.base <= net.high, `Y${year} net ordering (anti-paired)`);
}

// Funnel: bands must widen over the horizon
const series = yearlySeries(a, ucs);
const width = (p: { low: number; high: number }) => p.high - p.low;
assert(
  width(series.value.points[2]) > width(series.value.points[0]),
  "value band widens Y1→Y3",
);
assert(
  width(series.cost.points[2]) > width(series.cost.points[0]),
  "cost band widens Y1→Y3",
);

// Consumption truth: higher adoption → strictly higher cost
const byAdoption = costValueByAdoption(a, ucs);
for (let i = 1; i < byAdoption.length; i++) {
  assert(
    byAdoption[i].cost.base > byAdoption[i - 1].cost.base,
    `cost monotonic in breadth at step ${i}`,
  );
}
console.log(
  `adoption sweep: 10% → cost ${fmtCurrency(byAdoption[1].cost.base)}, 100% → cost ${fmtCurrency(byAdoption[10].cost.base)}`,
);

const be = breakEvenMonth(a, ucs);
console.log(`break-even month: low=${be.low} base=${be.base} high=${be.high}`);
// Optimistic edge can never cross later than conservative edge
if (be.high !== null && be.low !== null) assert(be.high <= be.low, "break-even edge ordering");
if (be.high !== null && be.base !== null) assert(be.high <= be.base, "break-even high<=base");

const bea = breakEvenAdoption(a, ucs);
console.log(`break-even adoption (base): ${bea === null ? "none" : `${Math.round(bea * 100)}%`}`);

// Cost realism + ratio + band-width sanity (Part 4)
const v3 = annualValue(a, ucs, 3);
const c3 = annualTokenCost(a, ucs, 3);
const directOverride = 1_234_567;
const overriddenC3 = annualTokenCost(
  { ...a, annualCostOverrides: { "3": directOverride } },
  ucs,
  3,
);
assert.deepStrictEqual(
  overriddenC3,
  { low: directOverride, base: directOverride, high: directOverride },
  "bottom-up direct annual cost override replaces the modeled band",
);
const ratio3 = ratioVsCost(v3, c3);
const relW = (r: { low: number; base: number; high: number }) => (r.high - r.low) / r.base;
console.log(
  `Y3 value ${fmtCurrency(v3.base)} · cost ${fmtCurrency(c3.base)} · ratio ${ratio3.base.toFixed(1)}× ` +
    `(plausible≤${30}: ${ratioPlausible(ratio3.base)}) · cost-band relW ${relW(c3).toFixed(2)} vs value-band relW ${relW(v3).toFixed(2)}`,
);
// Cost band must not be wildly wider than the value band (no worst-case stacking)
assert(relW(c3) <= relW(v3) * 1.5 + 0.01, "cost-band width sane vs value-band width");
// Value-realism fix: the realization haircut must keep the headline ratio under
// the plausibility ceiling on the default scenario (value honest, not capped).
assert(ratioPlausible(ratio3.base), `Y3 ratio must be plausible after realization haircut (got ${ratio3.base.toFixed(1)}×)`);
// And break-even must be a real period, not month 1 (the ramp-from-zero fix).
assert(be.base !== null && be.base > 1, `break-even base must be a real period > month 1 (got ${be.base})`);

// JSON round-trip (the wire-format guard)
const roundTrip = JSON.parse(JSON.stringify(series));
assert.deepStrictEqual(roundTrip, series, "yearlySeries JSON round-trip");

console.log("\nAll engine invariants hold. ✓");
