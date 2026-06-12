import type { UseCase } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";

/**
 * Seed use-case library. Asset/wealth management ships first; the structure
 * is industry-keyed so more verticals drop in without touching the picker or
 * any section module. Sizing knobs (hours saved × instances/month) feed the
 * bottom-up value build — they are starting points a practitioner should
 * pressure-test with the client (discernment, not gospel).
 */
export const SEED_USE_CASES: UseCase[] = [
  {
    id: "awm-meeting-prep",
    label: "Client meeting prep & briefing books",
    industry: "Asset & Wealth Management",
    personaHint:
      "Senior financial advisor preparing for 10–15 client reviews a week",
    hoursSavedPerInstance: ranged(0.75, 1.5, 2.5),
    instancesPerMonthPerUser: ranged(4, 8, 14),
    tags: ["augmentation", "delegation"],
  },
  {
    id: "awm-rfp-ddq",
    label: "RFP / DDQ response drafting",
    industry: "Asset & Wealth Management",
    personaHint: "Institutional sales associate answering due-diligence questionnaires",
    hoursSavedPerInstance: ranged(3, 6, 10),
    instancesPerMonthPerUser: ranged(0.5, 1, 2),
    tags: ["automation", "description"],
  },
  {
    id: "awm-research-synthesis",
    label: "Investment research summarization & synthesis",
    industry: "Asset & Wealth Management",
    personaHint: "Equity/credit analyst covering 30+ names across sources",
    hoursSavedPerInstance: ranged(0.5, 1, 2),
    instancesPerMonthPerUser: ranged(8, 15, 25),
    tags: ["augmentation", "discernment"],
  },
  {
    id: "awm-portfolio-commentary",
    label: "Portfolio commentary & client letters",
    industry: "Asset & Wealth Management",
    personaHint: "Portfolio manager producing quarterly commentary across funds",
    hoursSavedPerInstance: ranged(2, 4, 7),
    instancesPerMonthPerUser: ranged(0.5, 1, 2),
    tags: ["automation", "description"],
  },
  {
    id: "awm-kyc-onboarding",
    label: "KYC / onboarding document review",
    industry: "Asset & Wealth Management",
    personaHint: "Operations associate processing new-account documentation",
    hoursSavedPerInstance: ranged(0.5, 1, 1.5),
    instancesPerMonthPerUser: ranged(6, 12, 20),
    tags: ["automation", "diligence"],
  },
  {
    id: "awm-reg-monitoring",
    label: "Regulatory change monitoring & gap analysis",
    industry: "Asset & Wealth Management",
    personaHint: "Compliance officer tracking SEC/FINRA rule changes",
    hoursSavedPerInstance: ranged(1, 2, 4),
    instancesPerMonthPerUser: ranged(2, 4, 6),
    tags: ["augmentation", "diligence"],
  },
  {
    id: "awm-pitch-books",
    label: "Pitch book & proposal generation",
    industry: "Asset & Wealth Management",
    personaHint: "Institutional distribution team building prospect decks",
    hoursSavedPerInstance: ranged(2, 4, 8),
    instancesPerMonthPerUser: ranged(1, 2, 4),
    tags: ["automation", "delegation"],
  },
  {
    id: "awm-performance-qa",
    label: "Fund performance & attribution Q&A agent",
    industry: "Asset & Wealth Management",
    personaHint: "Client service team answering performance questions same-day",
    hoursSavedPerInstance: ranged(0.25, 0.5, 1),
    instancesPerMonthPerUser: ranged(10, 20, 40),
    tags: ["agency", "delegation"],
  },
];

export const INDUSTRIES: string[] = [
  ...new Set(SEED_USE_CASES.map((u) => u.industry)),
];

export function useCasesByIndustry(industry: string): UseCase[] {
  return SEED_USE_CASES.filter((u) => u.industry === industry);
}

export function resolveUseCases(ids: string[]): UseCase[] {
  return ids
    .map((id) => SEED_USE_CASES.find((u) => u.id === id))
    .filter((u): u is UseCase => u !== undefined);
}
