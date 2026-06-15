// ─────────────────────────────────────────────────────────────────────────────
// Tunable constants for the value-approach slider. PLACEHOLDER benchmark
// numbers (uplift %, addressable share, pool sizes) follow the same convention
// as lib/data/defaults.ts — they are starting points to confirm against cited
// sources before presenting, NOT gospel. Everything here is user-editable in
// the value-model panel.
// ─────────────────────────────────────────────────────────────────────────────

import type { Ranged, ValueApproach, ValuePool } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";

/** Label shown when a benchmark % has no citation. Never invent a source. */
export const UNCITED = "uncited — user to verify";

/**
 * Confidence-band half-width per approach (lib/economics/ranged.ts →
 * bandAroundBase). The band reflects METHODOLOGICAL confidence — a coarser
 * approach is less certain — and narrows as the user goes deeper, which is the
 * whole economic point of the slider. The engine's raw multiplicative band is
 * deliberately NOT used for the value case (it widens most for the most-
 * detailed build, the opposite of real confidence).
 */
export const APPROACH_BAND_HALF_WIDTH_PCT: Record<ValueApproach, number> = {
  top_down: 0.35,
  middle: 0.22,
  bottom_up: 0.12,
};

/**
 * Which input groups are active (shown) at each approach. The renderer shows a
 * group only if it appears here; deeper approaches add groups. Values for
 * hidden groups stay in state so toggling back preserves them.
 */
export const ACTIVE_INPUT_GROUPS: Record<ValueApproach, string[]> = {
  top_down: ["topline"],
  middle: ["topline", "valuePool"],
  bottom_up: ["useCase", "adoption", "tokens"],
};

export interface ValueApproachConfig {
  approach: ValueApproach;
  bandHalfWidthPct: number;
  activeInputGroups: string[];
}

export function resolveValueApproach(approach: ValueApproach): ValueApproachConfig {
  return {
    approach,
    bandHalfWidthPct: APPROACH_BAND_HALF_WIDTH_PCT[approach],
    activeInputGroups: ACTIVE_INPUT_GROUPS[approach],
  };
}

// ── Benchmark defaults for the top_down approach (placeholders) ──────────────

/** Share of the top-line figure plausibly addressable by AI. */
export const DEFAULT_ADDRESSABLE_SHARE: Ranged = ranged(0.1, 0.18, 0.3);
/** Benchmark efficiency uplift on the addressable base. */
export const DEFAULT_UPLIFT_PCT: Ranged = ranged(0.15, 0.25, 0.4);
/** How much of the theoretical uplift is actually realized. */
export const DEFAULT_REALIZATION_FACTOR: Ranged = ranged(0.4, 0.6, 0.8);

// ── Value-pool templates for the middle approach, keyed by industry ──────────
// Pool `size` is left at 0 here; the deterministic prefill derives a real size
// from the company's labor base. These templates only seed the pool list +
// per-pool uplift/adoption priors.

const GENERIC_POOLS: Omit<ValuePool, "size">[] = [
  { id: "research", label: "Research & analysis", upliftPct: ranged(0.2, 0.32, 0.5), adoption: ranged(0.3, 0.5, 0.7), source: UNCITED },
  { id: "drafting", label: "Document drafting & review", upliftPct: ranged(0.25, 0.4, 0.6), adoption: ranged(0.3, 0.5, 0.75), source: UNCITED },
  { id: "servicing", label: "Client / customer servicing", upliftPct: ranged(0.15, 0.25, 0.4), adoption: ranged(0.25, 0.45, 0.65), source: UNCITED },
  { id: "compliance", label: "Compliance & controls", upliftPct: ranged(0.1, 0.2, 0.35), adoption: ranged(0.2, 0.4, 0.6), source: UNCITED },
];

const INDUSTRY_POOLS: Record<string, Omit<ValuePool, "size">[]> = {
  "Asset & Wealth Management": [
    { id: "research", label: "Investment research synthesis", upliftPct: ranged(0.2, 0.35, 0.55), adoption: ranged(0.3, 0.55, 0.75), source: UNCITED },
    { id: "client", label: "Client meeting prep & reporting", upliftPct: ranged(0.25, 0.4, 0.6), adoption: ranged(0.35, 0.55, 0.8), source: UNCITED },
    { id: "rfp", label: "RFP / DDQ & sales enablement", upliftPct: ranged(0.3, 0.45, 0.65), adoption: ranged(0.2, 0.4, 0.6), source: UNCITED },
    { id: "kyc", label: "KYC / onboarding & compliance", upliftPct: ranged(0.15, 0.25, 0.4), adoption: ranged(0.25, 0.45, 0.65), source: UNCITED },
  ],
  "Banking & Capital Markets": [
    { id: "credit", label: "Credit memos & underwriting", upliftPct: ranged(0.2, 0.35, 0.55), adoption: ranged(0.3, 0.5, 0.7), source: UNCITED },
    { id: "kyc", label: "KYC refresh & periodic review", upliftPct: ranged(0.2, 0.35, 0.5), adoption: ranged(0.3, 0.5, 0.7), source: UNCITED },
    { id: "research", label: "Earnings & market notes", upliftPct: ranged(0.25, 0.4, 0.6), adoption: ranged(0.3, 0.5, 0.75), source: UNCITED },
    { id: "deal", label: "Deal documentation", upliftPct: ranged(0.2, 0.3, 0.5), adoption: ranged(0.2, 0.4, 0.6), source: UNCITED },
  ],
};

/** Pool templates for an industry, falling back to a generic set. */
export function poolTemplatesForIndustry(
  industry: string | undefined,
): Omit<ValuePool, "size">[] {
  return (industry && INDUSTRY_POOLS[industry]) || GENERIC_POOLS;
}
