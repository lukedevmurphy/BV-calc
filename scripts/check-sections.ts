// Step-2 verification: run the registered sections end-to-end against a demo
// company and assert the SectionOutput contract. `npx tsx scripts/check-sections.ts`

import assert from "node:assert";
import { DEFAULT_ASSUMPTIONS, DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import { annualValue, breakEvenMonth } from "@/lib/economics/engine";
import { codingFigures } from "@/lib/economics/coding";
import {
  computeAllSections,
  defaultSectionConfig,
  normalizeSectionConfig,
} from "@/lib/sections/index";
import {
  CURRENT_PROPOSAL_SCHEMA_VERSION,
  migrateProposalPayload,
} from "@/lib/proposals/migrate";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import { fmtCurrency } from "@/lib/format";
import type { CompanyProfile, Ranged, UseCase, ValueApproach } from "@/lib/types";

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

assert.strictEqual(sections.length, 16, "all sixteen sections registered (peer + it_takeout omitted for the seed)");

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

// Value Calculation appendix slide: present, in the appendix lane, and its
// realized total ties out EXACTLY to the Business Value base (it must never
// drift from the slide it explains).
const vc = byKind.value_calculation;
assert(vc, "value_calculation section registered");
assert(vc.appendix === true, "value_calculation defaults into the appendix lane");
assert(vc.table && vc.table.rows.length > 0, "value_calculation carries a calculation table");
const realizedStat = (vc.stats ?? []).find((s) => s.label.startsWith("Realized annual value"));
assert(
  realizedStat?.value === fmtCurrency(byKind.business_value.rangedFigures!.annualValueFinalYear.base),
  "value_calculation realized total ties out to the business_value base",
);
console.log(`value calculation: realized total ${realizedStat?.value} ties to business value base ✓`);

// ── Coding-efficiency driver: section present, appendix, ties out, folded ────
const codingSec = byKind.coding_efficiency;
assert(codingSec, "coding_efficiency section registered");
assert(codingSec.appendix === true, "coding_efficiency defaults into the appendix lane");
const cf = codingSec.rangedFigures!;
assert(cf.codingTotalFinalYear, "coding total figure exposed");
assert(
  Math.abs(
    cf.codingCostSavingsFinalYear.base + cf.codingRevenueGrowthFinalYear.base - cf.codingTotalFinalYear.base,
  ) < 1,
  "coding total = cost savings + revenue growth (no leak)",
);
assert(
  (codingSec.stats ?? []).some((s) => s.label.startsWith("→")),
  "coding exposes → composition stats for the Settings readout",
);
// Folded into the headline: business_value base == use-case value + coding total.
const ucOnlyBase = annualValue(DEFAULT_ASSUMPTIONS, SEED_USE_CASES.slice(0, 4), DEFAULT_ASSUMPTIONS.horizonYears).base;
assert(
  Math.abs(byKind.business_value.rangedFigures!.annualValueFinalYear.base - (ucOnlyBase + cf.codingTotalFinalYear.base)) < 1,
  "business_value headline = use-case value + coding total (folded)",
);
// Exec summary surfaces coding as its own line (inherits the folded headline).
assert(
  (byKind.executive_summary.stats ?? []).some((s) => s.label.startsWith("Coding value")),
  "exec summary surfaces coding value",
);
console.log(
  `coding driver: total ${fmtCurrency(cf.codingTotalFinalYear.base)} folded into headline + own appendix slide ✓`,
);

// ── Value Map + Financial rollup: present, ordered, and totals tie to the
//    Business Value headline (shared driver/outcome rollup). ──────────────────
const bvBaseForMaps = byKind.business_value.rangedFigures!.annualValueFinalYear.base;
const vmSec = byKind.value_map;
assert(vmSec, "value_map section registered");
assert(vmSec.appendix !== true, "value_map is a main-body slide (not appendix)");
assert((vmSec.table?.columns.length ?? 0) === 4, "value_map aligns goal/objective/use-cases/driver");
assert(
  (vmSec.bullets ?? []).some((b) => b.includes(fmtCurrency(bvBaseForMaps))),
  "value_map surfaces a total tying to the business value headline",
);
const vmIdx = sections.findIndex((s) => s.kind === "value_map");
const bvIdx = sections.findIndex((s) => s.kind === "business_value");
assert(vmIdx >= 0 && bvIdx >= 0 && vmIdx < bvIdx, "value_map displays before business_value");

const frSec = byKind.financial_rollup;
assert(frSec, "financial_rollup section registered");
assert(frSec.appendix === true, "financial_rollup defaults into the appendix lane");
const frTotal = (frSec.stats ?? []).find((s) => s.label.startsWith("= Total P&L impact"));
assert(
  frTotal?.value === fmtCurrency(bvBaseForMaps),
  "financial_rollup P&L total ties to the business value headline",
);
assert(
  (frSec.stats ?? []).some((s) => s.label.includes("Operating expense")),
  "financial_rollup maps drivers to income-statement lines",
);
console.log(
  `value map + financial rollup: both tie to business value base ${fmtCurrency(bvBaseForMaps)} ✓`,
);

// ── IT cost takeout (opt-in): enabling it adds the section + folds into headline ──
const itEnabledSections = computeAllSections({
  company: demoCompany,
  assumptions: {
    ...DEFAULT_ASSUMPTIONS,
    itTakeout: {
      enabled: true,
      sunsetByYear: { "2": 4_000_000, "3": 8_000_000 },
      realization: { low: 0.5, base: 0.7, high: 0.9 },
    },
  },
  selectedUseCases: SEED_USE_CASES.slice(0, 4),
  sectionConfig: defaultSectionConfig(),
});
const itByKind = Object.fromEntries(itEnabledSections.map((s) => [s.kind, s]));
assert.strictEqual(itEnabledSections.length, 17, "enabling IT takeout adds its section (17 total)");
const itSec = itByKind.it_takeout;
assert(itSec && itSec.appendix === true, "it_takeout section present + appendix");
assert(itSec.rangedFigures?.itTakeoutFinalYear, "it_takeout figure exposed");
const baseNoIt = byKind.business_value.rangedFigures!.annualValueFinalYear.base; // seed (IT disabled)
const baseWithIt = itByKind.business_value.rangedFigures!.annualValueFinalYear.base;
assert(baseWithIt > baseNoIt, "IT takeout increases the business value headline");
assert(
  Math.abs(baseWithIt - (baseNoIt + itSec.rangedFigures!.itTakeoutFinalYear.base)) < 1,
  "business value headline = base + IT takeout (folded)",
);
const itVcRealized = (itByKind.value_calculation.stats ?? []).find((s) =>
  s.label.startsWith("Realized annual value"),
);
assert(
  itVcRealized?.value === fmtCurrency(baseWithIt),
  "value_calculation ties to business value base with IT takeout folded",
);
assert(
  (itByKind.executive_summary.stats ?? []).some((s) => s.label.startsWith("IT takeout")),
  "exec summary surfaces IT takeout",
);
console.log(
  `IT takeout fold: headline ${fmtCurrency(baseNoIt)} → ${fmtCurrency(baseWithIt)} (+${fmtCurrency(itSec.rangedFigures!.itTakeoutFinalYear.base)}) ✓`,
);

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

// bottom_up base is the engine value + the folded coding total, unchanged by
// the band normalization.
const expectedBuBase =
  annualValue(DEFAULT_ASSUMPTIONS, ucs4, DEFAULT_ASSUMPTIONS.horizonYears).base +
  codingFigures(DEFAULT_ASSUMPTIONS).finalYear.total.base;
assert(
  Math.abs(bu.base - expectedBuBase) < 1,
  "bottom_up base equals engine annualValue + coding total (regression guard)",
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

const topDownDeck = computeAllSections({
  company: demoCompany,
  assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: "top_down" },
  selectedUseCases: SEED_USE_CASES.slice(0, 4), // now CONSUMED — top-down is use-case-driven
  valueModel: DEFAULT_VALUE_MODEL,
  sectionConfig: defaultSectionConfig(),
});
assert(
  !(topDownDeck.find((section) => section.kind === "executive_summary")?.bullets ?? []).some(
    (bullet) => bullet.includes("sized bottom-up"),
  ),
  "top-down executive story never falls back to bottom-up language",
);
assert.strictEqual(
  topDownDeck.find((section) => section.kind === "cost")?.title,
  "Cost — Optional Directional Input",
  "top-down cost is direct/optional, not token-derived",
);
assert.strictEqual(
  topDownDeck.find((section) => section.kind === "cost")?.rangedFigures
    ?.implementationCost.base,
  0,
  "top-down value-only mode does not inherit bottom-up implementation cost",
);
// Top-down now USES use cases (the whole point): the persona slide renders and
// the business-value table breaks the envelope across the selected use cases.
assert(
  topDownDeck.some((section) => section.kind === "use_case_persona"),
  "top-down now renders the use-case persona section",
);
const tdBvRows = topDownDeck.find((s) => s.kind === "business_value")?.table?.rows ?? [];
const firstTdUc = SEED_USE_CASES.slice(0, 4)[0].label;
assert(
  tdBvRows.some((r) => String(r[0]) === firstTdUc),
  "top-down business value breaks down across the selected use cases",
);
// Tie-out still holds in top-down: financial_rollup P&L total == business_value base.
const tdBase = topDownDeck.find((s) => s.kind === "business_value")!.rangedFigures!.annualValueFinalYear.base;
const tdFrTotal = (topDownDeck.find((s) => s.kind === "financial_rollup")?.stats ?? []).find((s) =>
  s.label.startsWith("= Total P&L impact"),
);
assert(tdFrTotal?.value === fmtCurrency(tdBase), "top-down financial rollup ties to business value base");
console.log("top-down story: use-case-driven + ties out + optional direct cost ✓");

const directTopDownCost = 2_500_000;
const topDownWithCost = computeAllSections({
  company: demoCompany,
  assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: "top_down" },
  selectedUseCases: SEED_USE_CASES.slice(0, 4),
  valueModel: {
    ...DEFAULT_VALUE_MODEL,
    topDownAnnualCosts: { "3": directTopDownCost },
  },
  sectionConfig: defaultSectionConfig(),
});
assert.strictEqual(
  topDownWithCost.find((section) => section.kind === "cost")?.rangedFigures
    ?.annualCostFinalYear.base,
  directTopDownCost,
  "top-down direct cost survives into the shared structured section output",
);
assert.strictEqual(
  topDownWithCost.find((section) => section.kind === "cost")?.rangedFigures
    ?.annualCostFinalYear.low,
  directTopDownCost * 0.75,
  "top-down cost confidence band is -25%",
);
assert.strictEqual(
  topDownWithCost.find((section) => section.kind === "cost")?.rangedFigures
    ?.annualCostFinalYear.high,
  directTopDownCost * 1.25,
  "top-down cost confidence band is +25%",
);
assert.strictEqual(
  topDownWithCost.find((section) => section.kind === "forecast")?.bandedCharts?.[1]
    ?.points.at(-1)?.base,
  directTopDownCost,
  "top-down forecast uses the direct cost rather than the token engine",
);

// ── Reinvestment toggle: with the value-realism fix it moves BOTH the outcome
//    composition AND the realized TOTAL — capacity realizes less than offset, so
//    full-capacity value is strictly lower than full cost-out (this proves the
//    saved-hours leak is fixed, not merely re-labelled). ─────────────────────
const bvFor = (capacity: number) => {
  const out = computeAllSections({
    company: demoCompany,
    // Isolate the use-case reinvestment effect from the coding driver — coding
    // rides its own allocation slider, not the reinvestment toggle, so it would
    // only add a constant to both totals.
    assumptions: { ...DEFAULT_ASSUMPTIONS, reinvestmentCapacity: capacity, coding: undefined },
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
const capacity = bvFor(1); // full reinvest → revenue, realizes LESS
const offset = bvFor(0); // full cost-out → margin, realizes MORE
assert(
  capacity.composition !== offset.composition,
  "reinvestment toggle must change the value composition (capacity vs offset)",
);
assert(
  offset.total > capacity.total * 1.2,
  `reinvestment toggle must move the realized TOTAL (offset ${Math.round(offset.total)} should exceed capacity ${Math.round(capacity.total)} — capacity realizes less)`,
);
console.log(
  `reinvestment moves total + composition: offset ${fmtCurrency(offset.total)} > capacity ${fmtCurrency(capacity.total)} ` +
    `(${(offset.total / capacity.total).toFixed(2)}× spread)\n` +
    `  capacity: ${capacity.composition}\n  offset:   ${offset.composition} ✓`,
);

// ── Value realism: the haircut keeps the headline ratio plausible and pushes
//    break-even off month 1 (the whole point of this fix) ──────────────────────
const realismRoi = byKind.forecast.rangedFigures!.roiFinalYear.base;
assert(
  realismRoi <= 30,
  `value-realism: headline ratio must be plausible (got ${realismRoi.toFixed(1)}× > 30 — value not honest)`,
);
const realismBE = breakEvenMonth(DEFAULT_ASSUMPTIONS, ucs4);
assert(
  realismBE.base !== null && realismBE.base > 1,
  `value-realism: break-even must be a real period, not month 1 (got ${realismBE.base})`,
);
console.log(
  `value realism: ratio ${realismRoi.toFixed(1)}× (≤30, ⚠ cleared), break-even base month ${realismBE.base} (off month 1) ✓`,
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

// ── Ratio sanity (Part 4): an implausible ratio must WARN, never print bare ──
const roi = byKind.forecast.rangedFigures?.roiFinalYear;
const roiStat = (byKind.executive_summary.stats ?? []).find(
  (s) => s.label === "Value-to-cost ratio",
);
if (roi && roi.base > 30) {
  assert(
    roiStat !== undefined && roiStat.value.includes("⚠"),
    `implausible ratio (${roi.base.toFixed(0)}×) must show a warning, not a hero number`,
  );
  assert(
    (byKind.executive_summary.bullets ?? []).some((b) => b.includes("exceeds the plausible ceiling")),
    "implausible ratio must add a warning bullet",
  );
  console.log(`ratio sanity: ${roi.base.toFixed(0)}× > 30 → exec summary warns (no hero number) ✓`);
} else {
  console.log(`ratio sanity: ${roi ? roi.base.toFixed(1) + "×" : "n/a"} within ceiling ✓`);
}

// ── Peer Proof: real attributed story for a matched sub-industry; omitted else,
//    and the customer's results are NEVER presented as the target's ───────────
const peerFor = (industry: string) =>
  computeAllSections({
    company: { name: "TargetCo", industry },
    assumptions: DEFAULT_ASSUMPTIONS,
    selectedUseCases: ucs4,
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  }).find((s) => s.kind === "peer_proof");

const payments = peerFor("Payments & Card Networks"); // Visa-like → should match
const awm = peerFor("Asset & Wealth Management"); // demo → no curated peer → omit
assert(payments, "payments target matches a peer story");
assert(awm === undefined, "no relevant peer → section omitted (no fabrication)");
// Real customer named + sourced.
assert(/Satispay/.test(payments!.subtitle ?? ""), "peer subtitle names the real customer");
assert(
  (payments!.links ?? []).some((l) => l.url.startsWith("https://claude.com/customers/")),
  "peer story carries the real source URL",
);
assert(
  (payments!.bullets ?? []).some((b) => b.includes("claude.com/customers/")),
  "source URL also on-slide as text (survives pptx export)",
);
// Attribution discipline: outcomes attributed to the customer; analogy + provenance labeled.
assert(
  (payments!.stats ?? []).every((s) => s.label.includes("Satispay")),
  "every outcome stat is attributed to the real customer",
);
assert(
  (payments!.bullets ?? []).some((b) => /analogy, not TargetCo'?s result/i.test(b)),
  "target parallel is labeled an analogy, not the target's result",
);
assert(
  (payments!.bullets ?? []).some((b) => b.toLowerCase().includes("provenance")),
  "provenance flag present (sourced story vs author inference)",
);
console.log(
  `peer proof: payments → "${payments!.subtitle}" (sourced); AWM → omitted ✓`,
);

// Persisted proposal evolution: an unversioned payload and a config missing a
// newly registered section upgrade without losing existing configuration.
const legacyConfig = defaultSectionConfig().filter((c) => c.kind !== "cost");
const normalizedConfig = normalizeSectionConfig(legacyConfig);
assert(normalizedConfig.some((c) => c.kind === "cost"), "new section merged into old config");
const migrated = migrateProposalPayload({
  company: demoCompany,
  assumptions: DEFAULT_ASSUMPTIONS,
  selectedUseCaseIds: ucs4.map((u) => u.id),
  valueModel: DEFAULT_VALUE_MODEL,
  sectionConfig: legacyConfig,
  sections,
});
assert.strictEqual(migrated.schemaVersion, CURRENT_PROPOSAL_SCHEMA_VERSION);
assert.strictEqual(migrated.revision, 0, "legacy proposal starts at revision zero");
assert(migrated.sectionConfig.some((c) => c.kind === "cost"));
console.log("proposal migration: unversioned payload upgraded + missing section restored ✓");

// ── Custom use cases: a user-created use case carries its own driver mapping and
//    flows end-to-end (round-trips losslessly, rolls to its chosen driver). ────
const customUc: UseCase = {
  id: "custom-test-1",
  label: "Contract review (custom)",
  industry: "Custom",
  hoursSavedPerInstance: { low: 0.5, base: 1, high: 2 },
  instancesPerMonthPerUser: { low: 2, base: 4, high: 8 },
  drivers: ["risk_compliance"],
  custom: true,
  topDownTier: "high",
};
assert.deepStrictEqual(JSON.parse(JSON.stringify(customUc)), customUc, "custom use case JSON round-trip");
const withCustom = computeAllSections({
  company: demoCompany,
  assumptions: DEFAULT_ASSUMPTIONS,
  selectedUseCases: [...SEED_USE_CASES.slice(0, 2), customUc],
  sectionConfig: defaultSectionConfig(),
});
const vmRows = withCustom.find((s) => s.kind === "value_map")?.table?.rows ?? [];
assert(
  vmRows.some((r) => String(r[2]).includes("Contract review")),
  "custom use case appears in the value map under its chosen driver (risk/compliance)",
);
console.log("custom use case: own driver mapping flows into the value map ✓");

console.log("Section contract holds across all 16. ✓");
