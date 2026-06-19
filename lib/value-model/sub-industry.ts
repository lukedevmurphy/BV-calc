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
import type { DriverId } from "./drivers";

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
  realizationLabel: "Realization factor (%)",
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
      addressableLabel: "Addressable cost base (%)",
      addressableHelp: "Share of revenue tied to the cost base AI can compress (efficiency-ratio lens).",
      upliftLabel: "Efficiency uplift (%)",
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
      addressableLabel: "Addressable share (%)",
      addressableHelp: "Share of net revenues' cost base addressable by AI.",
      upliftLabel: "Productivity uplift (%)",
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
      addressableLabel: "Addressable share (%)",
      addressableHelp: "Share of the cost base AI can streamline.",
      upliftLabel: "Service-efficiency uplift (%)",
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
      addressableLabel: "Addressable operating share (%)",
      addressableHelp:
        "Share of the income base tied to operations AI can streamline — member servicing and branch / back-office workload.",
      upliftLabel: "Operating-efficiency uplift (%)",
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
      addressableLabel: "Addressable share (%)",
      addressableHelp: "Share of the fee-revenue cost base addressable by AI.",
      upliftLabel: "Productivity uplift (%)",
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
      addressableLabel: "Addressable opex share (%)",
      addressableHelp: "Share of operating expense (ops, risk, servicing) AI can compress.",
      upliftLabel: "Operating-efficiency uplift (%)",
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
      addressableLabel: "Addressable share (%)",
      addressableHelp: "Share of the top-line plausibly addressable by AI.",
      upliftLabel: "Benchmark uplift (%)",
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

// ── Per-sector value-driver weighting + vocabulary (FS-value-driver-taxonomy) ──
// Which drivers dominate for a sector (weights, relative — used to allocate the
// top-down total across the value tree) and what each driver is CALLED there.
// A `valueNote` carries the sector framing caveats from the taxonomy.

export interface SubIndustryDriverProfile {
  /** Drivers that matter most for the sector (lead the breakdown). */
  dominantDrivers: DriverId[];
  /** Relative weights used to split the top-down total across drivers. */
  driverWeights: Record<DriverId, number>;
  /** Sector-specific name for a driver (e.g. bank productivity = "cost-to-serve"). */
  driverVocab: Partial<Record<DriverId, string>>;
  /** Framing caveat surfaced in the value breakdown, when present. */
  valueNote?: string;
}

const W = (
  productivity: number,
  revenue_growth: number,
  cross_sell: number,
  onboarding_speed: number,
  risk_compliance: number,
): Record<DriverId, number> => ({
  productivity,
  revenue_growth,
  cross_sell,
  onboarding_speed,
  risk_compliance,
});

export const SUB_INDUSTRY_DRIVERS: Record<SubIndustryId, SubIndustryDriverProfile> = {
  diversified_bank: {
    dominantDrivers: ["productivity", "risk_compliance", "cross_sell"],
    driverWeights: W(0.4, 0.05, 0.15, 0.1, 0.3),
    driverVocab: {
      productivity: "cost-to-serve / efficiency ratio",
      risk_compliance: "loss-given-default avoidance",
      cross_sell: "fee income per customer",
    },
  },
  investment_bank: {
    dominantDrivers: ["productivity", "revenue_growth"],
    driverWeights: W(0.5, 0.3, 0.1, 0.05, 0.05),
    driverVocab: {
      productivity: "deal-team / research capacity",
      revenue_growth: "deal / coverage throughput",
    },
  },
  brokerage: {
    dominantDrivers: ["productivity", "cross_sell", "onboarding_speed"],
    driverWeights: W(0.4, 0.1, 0.25, 0.2, 0.05),
    driverVocab: {
      productivity: "advisor productivity",
      cross_sell: "share of wallet",
      onboarding_speed: "time-to-fund",
    },
  },
  credit_union: {
    dominantDrivers: ["productivity", "onboarding_speed", "risk_compliance"],
    driverWeights: W(0.4, 0.05, 0.05, 0.25, 0.25),
    driverVocab: {
      productivity: "cost-to-serve per member",
      onboarding_speed: "loan-decision time",
      risk_compliance: "compliance / non-interest expense",
    },
    valueNote:
      "Member-owned, not-for-profit — value is framed as returned to members / lower fees, not profit.",
  },
  asset_wealth_manager: {
    dominantDrivers: ["productivity", "cross_sell", "onboarding_speed"],
    driverWeights: W(0.4, 0.1, 0.25, 0.15, 0.1),
    driverVocab: {
      productivity: "research / client-reporting capacity",
      cross_sell: "net new assets",
      onboarding_speed: "client onboarding",
    },
  },
  card_network: {
    dominantDrivers: ["productivity", "risk_compliance", "onboarding_speed"],
    driverWeights: W(0.4, 0.05, 0.05, 0.2, 0.3),
    driverVocab: {
      productivity: "dispute-resolution / ops efficiency",
      risk_compliance: "fraud-loss avoidance",
      onboarding_speed: "merchant onboarding time",
    },
    valueNote:
      "Volume-driven, not headcount-driven — productivity is ops efficiency on a fixed transaction base.",
  },
  generic: {
    dominantDrivers: ["productivity", "risk_compliance", "cross_sell"],
    driverWeights: W(0.4, 0.1, 0.15, 0.15, 0.2),
    driverVocab: {},
  },
};

/** Driver profile for a resolved sub-industry. */
export function subIndustryDrivers(id: SubIndustryId): SubIndustryDriverProfile {
  return SUB_INDUSTRY_DRIVERS[id];
}

/** Sector name for a driver, falling back to the canonical driver label. */
export function sectorDriverLabel(
  id: SubIndustryId,
  driver: DriverId,
  fallback: string,
): string {
  return SUB_INDUSTRY_DRIVERS[id].driverVocab[driver] ?? fallback;
}
