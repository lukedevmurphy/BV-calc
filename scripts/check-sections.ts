// Step-2 verification: run the registered sections end-to-end against a demo
// company and assert the SectionOutput contract. `npx tsx scripts/check-sections.ts`

import assert from "node:assert";
import { DEFAULT_ASSUMPTIONS, DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import { annualValue } from "@/lib/economics/engine";
import {
  computeAllSections,
  defaultSectionConfig,
} from "@/lib/sections/index";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import { fmtCurrency } from "@/lib/format";
import type { CompanyProfile, Ranged, ValueApproach } from "@/lib/types";

const demoCompany: CompanyProfile = {
  name: "Crestline Asset Management",
  industry: "Asset & Wealth Management",
  employeeCount: 4500,
  sourceNotes: "Demo data (mocked)",
};

const sections = computeAllSections({
  company: demoCompany,
  assumptions: DEFAULT_ASSUMPTIONS,
  selectedUseCases: SEED_USE_CASES.slice(0, 4),
  sectionConfig: defaultSectionConfig(),
});

assert.strictEqual(sections.length, 12, "all twelve sections registered");

for (const s of sections) {
  // Wire-format guard: must survive JSON round-trip losslessly
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s)), s, `${s.kind} round-trip`);
  assert(s.title.length > 0, `${s.kind} has title`);
  assert((s.bullets ?? []).every((b) => b.length < 220), `${s.kind} bullets slide-ready`);
  console.log(`── ${s.kind} (order ${s.order}) ─────────────────────`);
  console.log(`   ${s.title} — ${s.subtitle ?? ""}`);
  for (const b of s.bullets ?? []) console.log(`   • ${b}`);
  for (const st of s.stats ?? []) console.log(`   [${st.label}] ${st.value}`);
  if (s.table) console.log(`   table: ${s.table.columns.join(" | ")} (${s.table.rows.length} rows)`);
  if (s.charts) console.log(`   charts: ${s.charts.map((c) => c.name).join("; ")}`);
  if (s.bandedCharts) console.log(`   banded: ${s.bandedCharts.map((c) => c.name).join("; ")}`);
  if (s.rangedFigures) console.log(`   rangedFigures: ${Object.keys(s.rangedFigures).join(", ")}`);
  console.log();
}

// Economic sections must expose machine-readable figures + audit trail
const byKind = Object.fromEntries(sections.map((s) => [s.kind, s]));
assert(byKind.business_value.rangedFigures?.annualValueFinalYear, "value figures exposed");
assert(byKind.cost.rangedFigures?.annualCostFinalYear, "cost figures exposed");
assert((byKind.cost.assumptionsUsed ?? []).length >= 5, "cost audit trail");
assert(byKind.forecast.bandedCharts?.length === 2, "forecast has value+cost bands");

// Scenario display (Part 4): the Exec Summary shows the FULL range; every other
// main slide shows the BASE case only + a "Base case" nugget. The underlying
// ranged data is unchanged, so the bases must still agree.
const execStats = byKind.executive_summary.stats ?? [];
const valueStat = execStats.find((s) => s.label.startsWith("Annual value"));
const bvStat = (byKind.business_value.stats ?? []).find((s) =>
  s.label.startsWith("Annual value, Year 3"),
);
const isRange = (v: string) => /\(.*–.*\)/.test(v);
assert(valueStat && isRange(valueStat.value), "exec summary shows the full range");
assert(bvStat && !isRange(bvStat.value), "business_value shows base case only (no inline range)");
assert(
  byKind.executive_summary.scenarioTag === undefined,
  "exec summary carries no scenario nugget",
);
assert(byKind.business_value.scenarioTag === "Base case", "business_value tagged Base case");
// Same underlying base despite different display.
assert(
  byKind.executive_summary.rangedFigures!.annualValueFinalYear.base ===
    byKind.business_value.rangedFigures!.annualValueFinalYear.base,
  "exec summary and business_value share the same base value",
);
// Cost slide is base-only too.
const costStat = (byKind.cost.stats ?? []).find((s) => s.label.startsWith("Annual cost, Year 3"));
assert(costStat && !isRange(costStat.value), "cost shows base case only");

// Default ordering: exec summary first on the page, computed last
assert.strictEqual(sections[0].kind, "executive_summary", "exec summary ordered first");

// ── Value-approach slider: band narrows with depth; keys are identical ───────
const ucs4 = SEED_USE_CASES.slice(0, 4);
const halfWidth = (r: Ranged) => (r.high - r.low) / (2 * r.base);
const valueFor = (approach: ValueApproach) => {
  const out = computeAllSections({
    company: demoCompany,
    assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: approach },
    selectedUseCases: ucs4,
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  });
  const bv = out.find((s) => s.kind === "business_value")!;
  return bv.rangedFigures!.annualValueFinalYear;
};

const td = valueFor("top_down");
const bu = valueFor("bottom_up");

// Both approaches emit the identical rangedFigures key set (downstream-agnostic)
for (const approach of ["top_down", "bottom_up"] as ValueApproach[]) {
  const out = computeAllSections({
    company: demoCompany,
    assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: approach },
    selectedUseCases: ucs4,
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  });
  const keys = Object.keys(out.find((s) => s.kind === "business_value")!.rangedFigures ?? {}).sort();
  assert.deepStrictEqual(keys, ["annualValueFinalYear", "annualValueY1"], `${approach} rangedFigures keys`);
}

// Confidence band: top_down (assumptive) is wider than bottom_up (defensible).
// This is the on-screen demo claim — it must actually hold.
assert(
  halfWidth(td) > halfWidth(bu),
  `top_down band (${(halfWidth(td) * 100).toFixed(0)}%) must be WIDER than bottom_up (${(halfWidth(bu) * 100).toFixed(0)}%)`,
);

// bottom_up base is the engine value, unchanged by the band normalization
assert(
  Math.abs(bu.base - annualValue(DEFAULT_ASSUMPTIONS, ucs4, DEFAULT_ASSUMPTIONS.horizonYears).base) < 1,
  "bottom_up base equals the engine annualValue base (regression guard)",
);
console.log(
  `value-approach bands: top_down ±${(halfWidth(td) * 100).toFixed(0)}% (wider) > bottom_up ±${(halfWidth(bu) * 100).toFixed(0)}% (tighter) ✓`,
);

// ── Sub-industry reactivity: labels + use-case default change per sector,
//    while the engine's computed value keys stay identical ──────────────────
const topDownDriverLabel = (industry: string) => {
  const out = computeAllSections({
    company: { ...demoCompany, industry },
    assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: "top_down" },
    selectedUseCases: ucs4,
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  });
  const bv = out.find((s) => s.kind === "business_value")!;
  return {
    // first driver row label (the sector's top-line concept)
    label: String(bv.table!.rows[0][0]),
    keys: Object.keys(bv.rangedFigures ?? {}).sort(),
  };
};

const cu = topDownDriverLabel("Banking — Credit Union");
const card = topDownDriverLabel("Payments & Card Networks");
const bank = topDownDriverLabel("Banking & Capital Markets");

// Labels must differ across sectors (the form/section is reactive)…
assert(
  cu.label !== card.label && cu.label !== bank.label && card.label !== bank.label,
  `top-down driver labels must differ per sector (credit union="${cu.label}", card="${card.label}", bank="${bank.label}")`,
);
// …but the computed value keys must be identical (downstream stays agnostic).
assert.deepStrictEqual(cu.keys, card.keys, "value keys identical: credit union vs card network");
assert.deepStrictEqual(cu.keys, bank.keys, "value keys identical: credit union vs bank");

// The use-case default + picker industry must also change per sector.
const cuSub = resolveSubIndustry("Banking — Credit Union");
const cardSub = resolveSubIndustry("Payments & Card Networks");
assert(
  JSON.stringify(cuSub.rankedUseCaseIds) !== JSON.stringify(cardSub.rankedUseCaseIds),
  "default use-case set must differ: credit union vs card network",
);
assert(
  resolveSubIndustry("totally unknown industry").id === "generic",
  "unmapped industry falls back to generic",
);
console.log(
  `sub-industry reactive: top-down label "${bank.label}" / "${cu.label}" / "${card.label}", value keys identical ✓`,
);

// ── Reinvestment toggle: re-routes the OUTCOME composition without changing
//    the headline total (capacity vs offset → different driver/outcome mix) ──
const bvFor = (capacity: number) => {
  const out = computeAllSections({
    company: demoCompany,
    assumptions: { ...DEFAULT_ASSUMPTIONS, reinvestmentCapacity: capacity },
    selectedUseCases: ucs4,
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  }).find((s) => s.kind === "business_value")!;
  const composition = (out.stats ?? [])
    .filter((s) => s.label.startsWith("→"))
    .map((s) => `${s.label}=${s.value}`)
    .join(" | ");
  return { total: out.rangedFigures!.annualValueFinalYear.base, composition };
};
const capacity = bvFor(1); // full reinvest → revenue
const offset = bvFor(0); // full cost-out → margin
assert(
  capacity.composition !== offset.composition,
  "reinvestment toggle must change the value composition (capacity vs offset)",
);
assert(
  Math.abs(capacity.total - offset.total) < 1,
  "reinvestment toggle must NOT change the headline total — only its composition",
);
console.log(
  `reinvestment re-routes composition (total unchanged ${Math.round(capacity.total) === Math.round(offset.total)}):\n` +
    `  capacity: ${capacity.composition}\n  offset:   ${offset.composition} ✓`,
);

// ── Scenario appendix slides carry the low / high figures (Part 4) ───────────
const scenarios = scenarioAppendixSlides(sections, DEFAULT_ASSUMPTIONS.horizonYears);
assert.strictEqual(scenarios.length, 2, "two scenario appendix slides generated");
const [conservative, upside] = scenarios;
assert(conservative.scenarioTag === "Conservative case" && conservative.appendix, "conservative slide tagged + appendix");
assert(upside.scenarioTag === "Upside case" && upside.appendix, "upside slide tagged + appendix");
const bvRange = byKind.business_value.rangedFigures!.annualValueFinalYear;
const consValue = (conservative.stats ?? []).find((s) => s.label.startsWith("Annual value"));
const upValue = (upside.stats ?? []).find((s) => s.label.startsWith("Annual value"));
assert(consValue?.value === fmtCurrency(bvRange.low), "conservative slide shows LOW value");
assert(upValue?.value === fmtCurrency(bvRange.high), "upside slide shows HIGH value");
console.log(
  `scenario appendix: conservative value=${consValue?.value} (low), upside value=${upValue?.value} (high) ✓`,
);

console.log("Section contract holds across all 12. ✓");
