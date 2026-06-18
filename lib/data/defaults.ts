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
];

/**
 * Sensible starting scenario for an asset/wealth-management proposal.
 * Every field is surfaced in the assumptions UI; bands are authored to widen
 * over the horizon so the forecast funnels naturally.
 */
export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  // Default altitude is bottom_up — the original, most-defensible behavior.
  valueApproach: "bottom_up",
  targetUserCount: 1000,

  // Dimension 1 — breadth: fraction of target users active, by year.
  adoptionBreadth: [
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

  avgTasksPerActiveUserPerMonth: ranged(30, 60, 120),
  avgTokensPerTask: { input: 20_000, output: 5_000 },
  modelMix: DEFAULT_MODEL_MIX,

  loadedHourlyCost: ranged(75, 95, 130),
  implementationCost: ranged(150_000, 250_000, 400_000),
  horizonYears: 3,
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
};
