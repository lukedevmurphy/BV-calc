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

// Exec summary must exactly match the sections it summarizes (it runs last
// and assembles deterministically — verify the contract holds).
const execStats = byKind.executive_summary.stats ?? [];
const valueStat = execStats.find((s) => s.label.startsWith("Annual value"));
const bvStat = (byKind.business_value.stats ?? []).find((s) =>
  s.label.startsWith("Annual value, Year 3"),
);
assert(valueStat && bvStat && valueStat.value === bvStat.value,
  "exec summary value matches business_value exactly");
const costStat = execStats.find((s) => s.label.startsWith("Annual cost"));
const costSectionStat = (byKind.cost.stats ?? []).find((s) =>
  s.label.startsWith("Annual cost, Year 3"),
);
assert(costStat && costSectionStat && costStat.value === costSectionStat.value,
  "exec summary cost matches cost section exactly");

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

console.log("Section contract holds across all 12. ✓");
