// ─────────────────────────────────────────────────────────────────────────────
// Sub-industry taxonomy — the deterministic data layer that makes the form
// reactive to the confirmed company. company.industry is mapped to one of these
// entries, which then drives:
//   • the use-case picker's default industry + pre-ranked use cases (bottom-up)
//   • the top-down driver vocabulary (labels + help) and the section table rows
//   • benchmark priors for the value-model prefill
//
// The underlying ECONOMICS NEVER CHANGE: top-down value is always
//   topline × addressableShare × upliftPct × realizationFactor
// and the computed rangedFigures keys (annualValueY1, annualValueFinalYear) are
// identical across sectors. Only the LABELS, HELP TEXT, priors, and default
// use-case selection differ — so every downstream section stays agnostic.
//
// All benchmark priors are PLACEHOLDERS flagged "uncited — user to verify"; we
// never fabricate a citation. A later model-backed provider (see
// prefill/provider.ts) can populate the same fields with no UI/section changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Ranged } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";
import { UNCITED } from "./constants";

export type SubIndustryId =
  | "diversified_bank"
  | "investment_bank"
  | "brokerage"
  | "credit_union"
  | "asset_wealth_manager"
  | "card_network"
  | "generic";

/** Labels + help for the four top-down driver fields, per sector. The four
 *  map 1:1 onto ValueModelInputs.{topline, addressableShare, upliftPct,
 *  realizationFactor} — same math, sector-specific words. `*RowLabel` is the
 *  driver label used in the Business Value section's top-down table. */
export interface TopDownDriverVocab {
  toplineLabel: string;
  toplineHelp: string;
  addressableLabel: string;
  addressableHelp: string;
  upliftLabel: string;
  upliftHelp: string;
  realizationLabel: string;
  realizationHelp: string;
  toplineRowLabel: string;
  addressableRowLabel: string;
  upliftRowLabel: string;
  realizationRowLabel: string;
}

/** Sector benchmark priors for the top-down prefill. Always uncited. */
export interface SubIndustryPriors {
  addressableShare: Ranged;
  upliftPct: Ranged;
  realizationFactor: Ranged;
  upliftSource: string;
}

export interface SubIndustry {
  id: SubIndustryId;
  label: string;
  /** Catalog industry the use-case picker defaults to for this sector. */
  useCaseIndustry: string;
  /** Most-relevant-first use-case IDs — the default selection on confirm. */
  rankedUseCaseIds: string[];
  topDown: TopDownDriverVocab;
  priors: SubIndustryPriors;
}

const REALIZATION: Ranged = ranged(0.4, 0.6, 0.8);
const ADDRESSABLE: Ranged = ranged(0.1, 0.18, 0.3);

// Shared "Realization factor" field (same concept everywhere).
const realization = {
  realizationLabel: "Realization factor (0–1)",
  realizationHelp: "How much of the theoretical uplift is actually realized.",
  realizationRowLabel: "Realization factor",
};

export const SUB_INDUSTRIES: Record<SubIndustryId, SubIndustry> = {
  diversified_bank: {
    id: "diversified_bank",
    label: "Diversified bank",
    useCaseIndustry: "Banking & Capital Markets",
    rankedUseCaseIds: ["bcm-credit-memos", "bcm-kyc-refresh", "bcm-earnings-notes", "bcm-deal-docs"],
    topDown: {
      toplineLabel: "Total revenue",
      toplineHelp: "Net interest income + fee income — the revenue base the efficiency lens applies to.",
      addressableLabel: "Addressable cost base (0–1)",
      addressableHelp: "Share of revenue tied to the cost base AI can compress (efficiency-ratio lens).",
      upliftLabel: "Efficiency uplift (0–1)",
      upliftHelp: "Improvement in the efficiency ratio attributable to AI.",
      ...realization,
      toplineRowLabel: "Total revenue",
      addressableRowLabel: "Addressable cost base",
      upliftRowLabel: "Efficiency uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.12, 0.2, 0.32), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  investment_bank: {
    id: "investment_bank",
    label: "Investment bank",
    useCaseIndustry: "Investment Banking",
    rankedUseCaseIds: ["ib-pitch-agent", "ib-model-builder", "ib-meeting-prep"],
    topDown: {
      toplineLabel: "Net revenues",
      toplineHelp: "Banking + markets net revenues the uplift applies to.",
      addressableLabel: "Addressable share (0–1)",
      addressableHelp: "Share of net revenues' cost base addressable by AI.",
      upliftLabel: "Productivity uplift (0–1)",
      upliftHelp: "Deal-team / analyst productivity uplift from AI.",
      ...realization,
      toplineRowLabel: "Net revenues",
      addressableRowLabel: "Addressable share",
      upliftRowLabel: "Productivity uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.15, 0.25, 0.4), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  brokerage: {
    id: "brokerage",
    label: "Brokerage / trading",
    useCaseIndustry: "Asset & Wealth Management",
    rankedUseCaseIds: ["awm-meeting-prep", "awm-performance-qa", "awm-research-synthesis", "awm-kyc-onboarding"],
    topDown: {
      toplineLabel: "Net revenue",
      toplineHelp: "Net interest + trading + advisory revenue.",
      addressableLabel: "Addressable share (0–1)",
      addressableHelp: "Share of the cost base AI can streamline.",
      upliftLabel: "Service-efficiency uplift (0–1)",
      upliftHelp: "Client-servicing and operations efficiency uplift.",
      ...realization,
      toplineRowLabel: "Net revenue",
      addressableRowLabel: "Addressable share",
      upliftRowLabel: "Service-efficiency uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.15, 0.25, 0.4), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  credit_union: {
    id: "credit_union",
    label: "Credit union (member-owned)",
    useCaseIndustry: "Banking & Capital Markets",
    rankedUseCaseIds: ["bcm-kyc-refresh", "bcm-credit-memos", "bcm-deal-docs", "bcm-earnings-notes"],
    topDown: {
      toplineLabel: "Net interest + non-interest income",
      toplineHelp:
        "Member revenue base (NII + fees). A credit union is member-owned and not-for-profit — there is no commercial 'top-line revenue'.",
      addressableLabel: "Addressable operating share (0–1)",
      addressableHelp:
        "Share of the income base tied to operations AI can streamline — member servicing and branch / back-office workload.",
      upliftLabel: "Operating-efficiency uplift (0–1)",
      upliftHelp: "Efficiency uplift across member servicing, lending ops and compliance.",
      ...realization,
      toplineRowLabel: "Net interest + non-interest income",
      addressableRowLabel: "Addressable operating share",
      upliftRowLabel: "Operating-efficiency uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.12, 0.2, 0.32), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  asset_wealth_manager: {
    id: "asset_wealth_manager",
    label: "Asset / wealth manager",
    useCaseIndustry: "Asset & Wealth Management",
    rankedUseCaseIds: ["awm-research-synthesis", "awm-meeting-prep", "awm-rfp-ddq", "awm-portfolio-commentary"],
    topDown: {
      toplineLabel: "Management-fee revenue",
      toplineHelp: "Revenue from fees on AUM / client assets.",
      addressableLabel: "Addressable share (0–1)",
      addressableHelp: "Share of the fee-revenue cost base addressable by AI.",
      upliftLabel: "Productivity uplift (0–1)",
      upliftHelp: "Investment and client-servicing productivity uplift.",
      ...realization,
      toplineRowLabel: "Management-fee revenue",
      addressableRowLabel: "Addressable share",
      upliftRowLabel: "Productivity uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.15, 0.25, 0.4), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  card_network: {
    id: "card_network",
    label: "Card / payments network",
    useCaseIndustry: "Operations",
    rankedUseCaseIds: ["ops-kyc-screener", "bcm-kyc-refresh", "bcm-deal-docs"],
    topDown: {
      toplineLabel: "Net revenue (volume × take-rate)",
      toplineHelp:
        "Net revenue ≈ total payments volume × take-rate. Card networks scale with transaction volume, not headcount.",
      addressableLabel: "Addressable opex share (0–1)",
      addressableHelp: "Share of operating expense (ops, risk, servicing) AI can compress.",
      upliftLabel: "Operating-efficiency uplift (0–1)",
      upliftHelp: "Efficiency uplift across transaction ops, risk and servicing.",
      ...realization,
      toplineRowLabel: "Net revenue (volume × take-rate)",
      addressableRowLabel: "Addressable opex share",
      upliftRowLabel: "Operating-efficiency uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.12, 0.2, 0.3), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },

  // Fallback for any unmapped industry — preserves the original generic
  // vocabulary and the app's historical default (AWM use cases).
  generic: {
    id: "generic",
    label: "Financial services",
    useCaseIndustry: "Asset & Wealth Management",
    rankedUseCaseIds: ["awm-research-synthesis", "awm-meeting-prep", "awm-rfp-ddq", "awm-portfolio-commentary"],
    topDown: {
      toplineLabel: "Company top-line",
      toplineHelp: "Annual revenue (or labor base) the AI uplift applies to.",
      addressableLabel: "Addressable share (0–1)",
      addressableHelp: "Share of the top-line plausibly addressable by AI.",
      upliftLabel: "Benchmark uplift (0–1)",
      upliftHelp: "Benchmark efficiency uplift on the addressable base.",
      ...realization,
      toplineRowLabel: "Company top-line",
      addressableRowLabel: "Addressable share",
      upliftRowLabel: "Benchmark uplift",
    },
    priors: { addressableShare: ADDRESSABLE, upliftPct: ranged(0.15, 0.25, 0.4), realizationFactor: REALIZATION, upliftSource: UNCITED },
  },
};

/**
 * Map a free-text company.industry to a sub-industry (keyword match, ordered so
 * the more specific sectors win). Falls back to `generic` when unmapped — the
 * "sensible fallback" so the form never breaks on an unknown industry.
 */
export function resolveSubIndustry(industry: string | undefined): SubIndustry {
  const s = (industry ?? "").toLowerCase();
  const pick = (id: SubIndustryId) => SUB_INDUSTRIES[id];

  if (!s) return pick("generic");
  if (s.includes("credit union")) return pick("credit_union");
  if (s.includes("payment") || s.includes("card")) return pick("card_network");
  if (s.includes("brokerage") || s.includes("trading")) return pick("brokerage");
  if (s.includes("investment bank")) return pick("investment_bank");
  if (s.includes("asset") || s.includes("wealth")) return pick("asset_wealth_manager");
  if (s.includes("bank")) return pick("diversified_bank");
  return pick("generic");
}
