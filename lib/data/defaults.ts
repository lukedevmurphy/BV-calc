import type { ScenarioAssumptions, ValueModelInputs } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";
import {
  DEFAULT_ADDRESSABLE_SHARE,
  DEFAULT_REALIZATION_FACTOR,
  DEFAULT_UPLIFT_PCT,
  UNCITED,
} from "@/lib/value-model/constants";

// TODO: confirm current Claude model names + pricing at build time — do not
// trust these placeholder values. They were seeded from Anthropic's published
// per-MTok prices as of June 2026 (Opus 4.8 $5/$25, Sonnet 4.6 $3/$15,
// Haiku 4.5 $1/$5) and WILL go stale. Every row is fully user-editable in the
// model-mix editor; nothing in the engine or any section references a model
// name — pricing lives only in this object.
export const DEFAULT_MODEL_MIX: ScenarioAssumptions["modelMix"] = [
  {
    id: "frontier",
    label: "Claude Opus 4.8",
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    sharePct: 20,
  },
  {
    id: "balanced",
    label: "Claude Sonnet 4.6",
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    sharePct: 50,
  },
  {
    id: "fast",
    label: "Claude Haiku 4.5",
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    sharePct: 30,
  },
  // Fable 5 access is currently RESTRICTED (export-control) — there is no stable
  // public list price, so pricing is a labeled placeholder (0 / 0) at 0% share.
  // NEVER auto-fill a real-looking number here; the user enters it manually if
  // they have it. Same provenance treatment as the illustrative-seed flag.
  {
    id: "fable",
    label: "Claude Fable 5",
    inputPricePerMTok: 0,
    outputPricePerMTok: 0,
    sharePct: 0,
    restricted: true,
    priceNote:
      "restricted — list price TBD, confirm at anthropic.com (access currently restricted; placeholder, not for live use)",
  },
];

/**
 * Value-realization haircuts — the core of the value-realism fix. A freed hour
 * is NOT a dollar at full loaded rate; it becomes money only to the extent it is
 * actually realized, and the rate differs by reinvestment posture:
 *   OFFSET (cost-out)  — freed hours → avoided cost. Higher, but still < 1:
 *     fractional hours scattered across many people rarely all become FTE cuts.
 *   CAPACITY (reinvest)— freed capacity → earning output. LOWER: monetizing
 *     reinvested capacity is speculative.
 * Both are ESTIMATES (ranged conservative/base/optimistic), fully user-editable
 * and persisted — same discipline as the token defaults in #6. They are the
 * single most important behavioral lever: the reinvestment toggle now moves the
 * TOTAL value (offset > capacity), not just its composition.
 */
export const DEFAULT_VALUE_REALIZATION = {
  offset: ranged(0.15, 0.25, 0.4),
  capacity: ranged(0.06, 0.12, 0.22),
} as const;

/**
 * Persona coverage — the share of the SELECTED workflows a typical adopter
 * actually runs. The bottom-up sum credits every adopter with every selected use
 * case at full volume, but those use cases map to DISTINCT personas, so a typical
 * adopter runs only a subset. ~0.25 ≈ "about one of four selected workflows".
 * Editable; corrects the structural "everyone does everything" overcount that
 * otherwise inflates per-adopter saved hours to implausible levels.
 */
export const DEFAULT_USE_CASE_COVERAGE = 0.25;

/**
 * Sensible starting scenario for an asset/wealth-management proposal.
 * Every field is surfaced in the assumptions UI; bands are authored to widen
 * over the horizon so the forecast funnels naturally.
 */
export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  // Default altitude is bottom_up — the original, most-defensible behavior.
  valueApproach: "bottom_up",
  targetUserCount: 1000,

  // Dimension 1 — breadth: fraction of target users active, by year. The Year-0
  // "Launch" anchor at zero makes adoption ramp from near-zero through the first
  // year (≈1% month 1, ≈5% end of Q1) instead of snapping to the Year-1 level on
  // day one — so cumulative value accrues gradually and break-even is a real
  // period, not month 1. Year 1/2/3 endpoints are unchanged (annual figures
  // sample integer years), so only the intra-year-1 curve and break-even shift.
  adoptionBreadth: [
    { year: 0, low: 0, base: 0, high: 0 },
    { year: 1, low: 0.15, base: 0.25, high: 0.4 },
    { year: 2, low: 0.25, base: 0.4, high: 0.6 },
    { year: 3, low: 0.3, base: 0.55, high: 0.8 },
  ],

  // Dimension 2 — depth: consumption intensity per adopter (1.0 = the
  // baseline workload sized below), by year.
  usageDepth: [
    { year: 1, low: 0.6, base: 1.0, high: 1.5 },
    { year: 2, low: 0.8, base: 1.3, high: 2.2 },
    { year: 3, low: 1.0, base: 1.6, high: 3.0 },
  ],

  // Cost levers (estimates — editable). Document-heavy FS workloads reuse system
  // prompts + document context, so a moderate cache-hit default; some batchable.
  cacheHitRatio: 0.4,
  batchShare: 0.2,
  modelMix: DEFAULT_MODEL_MIX,

  loadedHourlyCost: ranged(75, 95, 130),
  implementationCost: ranged(150_000, 250_000, 400_000),
  horizonYears: 3,
  // Blend default (60% capacity / 40% offset) — the contested reinvestment
  // assumption, surfaced and editable on the Settings page. With the realization
  // factors below it now moves the TOTAL value, not just its composition.
  reinvestmentCapacity: 0.6,
  // Value-realism (the value-realism fix). Saved hours are realized to dollars
  // only partially, at posture-dependent rates; a typical adopter runs only a
  // subset of the selected workflows. All editable + persisted.
  offsetRealization: DEFAULT_VALUE_REALIZATION.offset,
  capacityRealization: DEFAULT_VALUE_REALIZATION.capacity,
  useCaseCoverage: DEFAULT_USE_CASE_COVERAGE,
};

/**
 * Static fallback value-model inputs (top_down approach). Used as builder
 * initial state before company pre-fill runs, and by computeAllSections when no
 * valueModel is supplied (e.g. verification scripts / pre-feature saved
 * payloads). bottom_up never reads it. Topline sized off a 1,000-person labor
 * base.
 */
const DEFAULT_TOPLINE_BASE = 180_000_000; // 1,000 × ~$180k loaded annual cost

export const DEFAULT_VALUE_MODEL: ValueModelInputs = {
  topline: ranged(
    Math.round(DEFAULT_TOPLINE_BASE * 0.85),
    DEFAULT_TOPLINE_BASE,
    Math.round(DEFAULT_TOPLINE_BASE * 1.15),
  ),
  addressableShare: DEFAULT_ADDRESSABLE_SHARE,
  upliftPct: DEFAULT_UPLIFT_PCT,
  upliftSource: UNCITED,
  realizationFactor: DEFAULT_REALIZATION_FACTOR,
  topDownFunctions: [
    "Sales & marketing",
    "Engineering / coding",
    "Employee productivity",
    "Operations",
  ],
  topDownAnnualCosts: {},
};
