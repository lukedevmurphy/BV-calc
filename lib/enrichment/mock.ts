import type { CompanyProfile, EnrichmentProvider } from "@/lib/types";

const DEMO_NOTE =
  "Demo data (mocked) — verify every field with the client before presenting";

// Fictional-but-realistic asset/wealth-management firms. Clearly labeled demo
// data; the confirm/edit step downstream exists so a practitioner verifies
// (discernment) before anything flows into the proposal.
const SEEDED: CompanyProfile[] = [
  {
    name: "Crestline Asset Management",
    domain: "crestlineam.example",
    industry: "Asset & Wealth Management",
    employeeCount: 4500,
    revenueModel: "Management fees on AUM (active equity, fixed income, multi-asset)",
    financialHighlights: [
      { label: "AUM", value: "$610B" },
      { label: "Revenue (FY)", value: "$3.1B" },
      { label: "Operating margin", value: "34%" },
      { label: "Investment professionals", value: "~900" },
    ],
    sourceNotes: DEMO_NOTE,
  },
  {
    name: "Hawthorne Wealth Advisors",
    domain: "hawthornewealth.example",
    industry: "Asset & Wealth Management",
    employeeCount: 600,
    revenueModel: "Advisory fees on client assets (RIA, HNW/UHNW households)",
    financialHighlights: [
      { label: "Client assets", value: "$48B" },
      { label: "Advisors", value: "210" },
      { label: "Households served", value: "~9,000" },
      { label: "Revenue (FY)", value: "$390M" },
    ],
    sourceNotes: DEMO_NOTE,
  },
  {
    name: "Beacon Mutual Investments",
    domain: "beaconmutual.example",
    industry: "Asset & Wealth Management",
    employeeCount: 1800,
    revenueModel: "Insurer-affiliated manager: general-account + third-party fixed income",
    financialHighlights: [
      { label: "AUM", value: "$220B" },
      { label: "Revenue (FY)", value: "$840M" },
      { label: "Fixed-income share of AUM", value: "72%" },
    ],
    sourceNotes: DEMO_NOTE,
  },
  {
    name: "Meridian Capital Partners",
    domain: "meridiancp.example",
    industry: "Asset & Wealth Management",
    employeeCount: 350,
    revenueModel: "Private markets: management fees + carried interest (PE, private credit)",
    financialHighlights: [
      { label: "AUM", value: "$38B" },
      { label: "Active funds", value: "11" },
      { label: "Portfolio companies", value: "64" },
    ],
    sourceNotes: DEMO_NOTE,
  },
];

export const SEEDED_COMPANY_NAMES = SEEDED.map((c) => c.name);

/**
 * v1 enrichment: seeded profiles for the demo companies, a labeled stub for
 * anything else. A real (web/EDGAR-backed) provider swaps in behind the same
 * interface without touching any section module — everything downstream
 * depends only on CompanyProfile.
 */
export class MockEnrichmentProvider implements EnrichmentProvider {
  async enrich(companyName: string): Promise<CompanyProfile> {
    const needle = companyName.trim().toLowerCase();
    const hit = SEEDED.find(
      (c) =>
        c.name.toLowerCase() === needle ||
        c.name.toLowerCase().includes(needle),
    );
    if (hit && needle.length > 2) return structuredClone(hit);

    return {
      name: companyName.trim() || "Unnamed Company",
      industry: "Asset & Wealth Management",
      sourceNotes:
        "No enrichment data available (mock provider) — fill in this profile manually",
    };
  }
}
