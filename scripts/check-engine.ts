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
import { codingValue } from "@/lib/economics/coding";
import { itTakeoutValueAtYear } from "@/lib/economics/it-takeout";
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

// ── Coding-efficiency driver invariants ──────────────────────────────────────
const cod = a.coding!; // DEFAULT_ASSUMPTIONS ships with coding on
const codeY1 = codingValue(cod, a, 1);
const codeY3 = codingValue(cod, a, 3);
for (const [name, r] of Object.entries(codeY3)) {
  assert(r.low <= r.base && r.base <= r.high, `coding ${name} band ordering`);
}
assert(codeY3.freedHours.low >= 0, "coding freed hours non-negative");
assert(
  Math.abs(codeY3.total.base - (codeY3.costSavings.base + codeY3.revenueGrowth.base)) < 1,
  "coding total = costSavings + revenueGrowth (no leak)",
);
assert(codeY1.total.base <= codeY3.total.base, "coding value ramps Y1 ≤ Y3");
// Allocation slider: 1 = all cost-out, 0 = all growth; monotonic in between.
const allCostOut = codingValue({ ...cod, allocation: 1 }, a, 3);
const allGrowth = codingValue({ ...cod, allocation: 0 }, a, 3);
assert(Math.abs(allCostOut.revenueGrowth.base) < 1, "allocation=1 → zero revenue path");
assert(Math.abs(allGrowth.costSavings.base) < 1, "allocation=0 → zero cost-out path");
assert(allCostOut.costSavings.base > allGrowth.costSavings.base, "cost-out share ↑ → cost-savings ↑");
assert(allGrowth.revenueGrowth.base > allCostOut.revenueGrowth.base, "cost-out share ↑ → revenue-growth ↓");
let prevCost = -1;
let prevRev = Infinity;
for (let i = 0; i <= 10; i++) {
  const r = codingValue({ ...cod, allocation: i / 10 }, a, 3);
  assert(r.costSavings.base >= prevCost - 1, `coding cost-savings monotonic at alloc ${i / 10}`);
  assert(r.revenueGrowth.base <= prevRev + 1, `coding revenue-growth monotonic at alloc ${i / 10}`);
  prevCost = r.costSavings.base;
  prevRev = r.revenueGrowth.base;
}
assert.deepStrictEqual(JSON.parse(JSON.stringify(codeY3)), codeY3, "coding result JSON round-trip");
console.log(
  `coding driver Y3: freed ${Math.round(codeY3.freedHours.base).toLocaleString("en-US")}h → ` +
    `cost ${fmtCurrency(codeY3.costSavings.base)} + rev ${fmtCurrency(codeY3.revenueGrowth.base)} = ${fmtCurrency(codeY3.total.base)} ✓`,
);

// ── IT cost takeout invariants ───────────────────────────────────────────────
const itT = {
  enabled: true,
  sunsetByYear: { "2": 3_000_000, "3": 6_000_000 },
  realization: { low: 0.5, base: 0.7, high: 0.9 },
};
const itY1 = itTakeoutValueAtYear(itT, 1);
const itY2 = itTakeoutValueAtYear(itT, 2);
const itY3 = itTakeoutValueAtYear(itT, 3);
assert(itY1.gross === 0, "IT takeout zero before sunset starts");
assert(itY2.gross === 3_000_000 && itY3.gross === 6_000_000, "IT takeout cumulative schedule");
assert(itY1.gross <= itY2.gross && itY2.gross <= itY3.gross, "IT takeout non-decreasing (sunset stays done)");
for (const [name, r] of [["Y1", itY1], ["Y2", itY2], ["Y3", itY3]] as const)
  assert(r.takeout.low <= r.takeout.base && r.takeout.base <= r.takeout.high, `IT takeout ${name} band ordering`);
assert(Math.abs(itY3.takeout.base - itY3.gross * 0.7) < 1, "IT takeout realized = gross × realization base");
const itOff = itTakeoutValueAtYear({ ...itT, enabled: false }, 3);
assert(itOff.gross === 0 && itOff.takeout.base === 0, "disabled IT takeout is zero");
console.log(`IT takeout Y3: gross ${fmtCurrency(itY3.gross)} → realized ${fmtCurrency(itY3.takeout.base)} ✓`);

console.log("\nAll engine invariants hold. ✓");
