// Step-2 verification: run the registered sections end-to-end against a demo
// company and assert the SectionOutput contract. `npx tsx scripts/check-sections.ts`

import assert from "node:assert";
import { DEFAULT_ASSUMPTIONS } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import {
  computeAllSections,
  defaultSectionConfig,
} from "@/lib/sections/index";
import type { CompanyProfile } from "@/lib/types";

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

console.log("Section contract holds across all 12. ✓");
