// ─────────────────────────────────────────────────────────────────────────────
// Scenario display layer (Part 4). The ranged data model is unchanged — every
// section still carries low/base/high in rangedFigures. This module only changes
// WHICH scenario each slide DISPLAYS:
//   • Executive Summary → the full range (handled in its own module).
//   • Every other main slide → BASE case only (applyBaseScenario strips the
//     inline low/high from stat cards and table cells), with a "Base case"
//     corner nugget (stamped in computeAllSections).
//   • The conservative / upside detail → auto-generated APPENDIX slides
//     (scenarioAppendixSlides), carrying the low / high figures.
// ─────────────────────────────────────────────────────────────────────────────

import type { Ranged, SectionOutput } from "@/lib/types";
import { fmtCurrency, fmtNumber } from "@/lib/format";

// "BASE (LOW–HIGH)" → "BASE". Whole-string only, and the parenthetical must
// contain an en-dash (the fmtRange separator), so roadmap-style "(base 25%)"
// trailers and other parentheticals are never touched.
const RANGE_RE = /^(.+?)\s\([^()]*–[^()]*\)$/;
// "LOW / BASE / HIGH" → "BASE" (fmtRangeTriple).
const TRIPLE_RE = /^([^/]+?)\s\/\s([^/]+?)\s\/\s([^/]+?)$/;
// Break-even "(optimistic …, conservative …)" trailer → stripped.
const SCENARIO_PAREN_RE = /\s*\((?:optimistic|conservative)[^)]*\)/i;

/** Reduce a displayed figure string to its base-case value. Safe no-op on
 *  strings that aren't a single ranged figure / triple. */
export function baseCaseValue(v: string): string {
  const triple = v.match(TRIPLE_RE);
  if (triple) return triple[2].trim();
  let out = v;
  const range = out.match(RANGE_RE);
  if (range) out = range[1].trim();
  return out.replace(SCENARIO_PAREN_RE, "").trim();
}

/** Strip inline low/high from a section's stat cards, hero stat and table cells,
 *  in place. Bullets/narrative (prose) are left to the section authors. */
export function applyBaseScenario(s: SectionOutput): void {
  if (s.heroStat) {
    // Drop the range entirely (not range: undefined — that breaks JSON round-trip).
    s.heroStat = { label: s.heroStat.label, value: baseCaseValue(s.heroStat.value) };
  }
  if (s.stats) {
    s.stats = s.stats.map((st) => ({ ...st, value: baseCaseValue(st.value) }));
  }
  if (s.table) {
    s.table = {
      ...s.table,
      rows: s.table.rows.map((row) =>
        row.map((cell) => (typeof cell === "string" ? baseCaseValue(cell) : cell)),
      ),
    };
  }
}

// ── Auto-generated scenario appendix slides ─────────────────────────────────

interface Edge {
  /** Which band edge this scenario reads. */
  value: "low" | "high";
  /** Cost is anti-paired: the conservative case pairs LOW value with HIGH cost. */
  cost: "low" | "high";
}

function figure(sections: SectionOutput[], kind: SectionOutput["kind"], key: string): Ranged | undefined {
  return sections.find((s) => s.kind === kind)?.rangedFigures?.[key];
}

function scenarioSlide(
  id: "scenario_conservative" | "scenario_upside",
  title: string,
  tag: string,
  subtitle: string,
  lede: string,
  edge: Edge,
  sections: SectionOutput[],
  finalYear: number,
): SectionOutput | null {
  const value = figure(sections, "business_value", "annualValueFinalYear");
  const cost = figure(sections, "cost", "annualCostFinalYear");
  const net = figure(sections, "forecast", "netFinalYear");
  const roi = figure(sections, "forecast", "roiFinalYear");
  if (!value && !cost && !net) return null;

  const stats = [
    value && { label: `Annual value, Y${finalYear}`, value: fmtCurrency(value[edge.value]) },
    cost && { label: `Annual cost, Y${finalYear}`, value: fmtCurrency(cost[edge.cost]) },
    net && { label: `Net value, Y${finalYear}`, value: fmtCurrency(net[edge.value]) },
    roi && { label: "Value-to-cost ratio", value: `${fmtNumber(roi[edge.value])}×` },
  ].filter(Boolean) as { label: string; value: string }[];

  return {
    id,
    kind: id,
    title,
    subtitle,
    narrative: lede,
    bullets: [
      `Every figure here is the ${tag.toLowerCase()} edge of the same ranged model — not a separate forecast`,
      `Cost is paired against value honestly: the conservative case sets low value against high cost, the upside the reverse`,
      `The base case carries the main deck; this slide is the band around it for teams pressure-testing the plan`,
    ],
    stats,
    speakerNotes:
      `${title}: the ${edge.value} edge of value and the ${edge.cost} edge of cost. Use it to show the range is ` +
      `modeled, not hand-waved — the main deck leads with the base case, the appendix carries the spread.`,
    scenarioTag: tag,
    order: 9000,
    enabled: true,
    appendix: true,
  };
}

/**
 * Build the conservative + upside appendix slides from the computed sections'
 * rangedFigures. Used by BOTH the Preview slideshow and the /api/pptx export so
 * the two stay in lockstep.
 */
export function scenarioAppendixSlides(
  sections: SectionOutput[],
  finalYear: number,
): SectionOutput[] {
  const conservative = scenarioSlide(
    "scenario_conservative",
    "Conservative Case",
    "Conservative case",
    "The low end of every range — the defensible floor",
    "If adoption is slow and usage stays light: low value set against high cost.",
    { value: "low", cost: "high" },
    sections,
    finalYear,
  );
  const upside = scenarioSlide(
    "scenario_upside",
    "Upside Case",
    "Upside case",
    "The optimistic end — if adoption and depth run ahead",
    "If adoption and usage depth run ahead of plan: high value against low cost.",
    { value: "high", cost: "low" },
    sections,
    finalYear,
  );
  return [conservative, upside].filter(Boolean) as SectionOutput[];
}
