// ─────────────────────────────────────────────────────────────────────────────
// Tunable constants for the value-approach slider. PLACEHOLDER benchmark
// numbers (uplift %, addressable share, pool sizes) follow the same convention
// as lib/data/defaults.ts — they are starting points to confirm against cited
// sources before presenting, NOT gospel. Everything here is user-editable in
// the value-model panel.
// ─────────────────────────────────────────────────────────────────────────────

import type { Ranged, ValueApproach } from "@/lib/types";
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
  bottom_up: 0.12,
};

/**
 * Which input groups are active (shown) at each approach. The renderer shows a
 * group only if it appears here; deeper approaches add groups. Values for
 * hidden groups stay in state so toggling back preserves them.
 */
export const ACTIVE_INPUT_GROUPS: Record<ValueApproach, string[]> = {
  top_down: ["topline"],
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
