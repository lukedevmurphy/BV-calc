import type { CompanyProfile, EnrichmentProvider } from "@/lib/types";

const DEMO_NOTE =
  "Demo data (mocked) — verify every field with the client before presenting";

// Real, well-known firms — but every figure below is a ROUNDED PLACEHOLDER, not
// a sourced financial. The note is shown as a badge on the confirm step so the
// practitioner knows to replace these with real numbers (discernment) before
// anything is presented. A real enrichment provider (EDGAR/web) swaps these out.
const SEED_NOTE =
  "Illustrative seed — placeholder figures for a real firm, NOT sourced; confirm every value before presenting";

// Seed profiles: four fictional asset/wealth firms (DEMO_NOTE) plus ten real,
// well-known financial-services firms with PLACEHOLDER financials (SEED_NOTE).
// All are clearly labeled; the confirm/edit step downstream exists so a
// practitioner verifies (discernment) before anything flows into the proposal.
const SEEDED: CompanyProfile[] = [
  {
    name: "Crestline Asset Management",
    domain: "crestlineam.example",
    headquarters: "Boston, MA",
    region: "Northeast",
    country: "United States",
    industry: "Asset & Wealth Management",
    employeeCount: 4500,
    engineeringHeadcount: 400,
    revenueGrowthRate: 0.08,
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
    headquarters: "Charlotte, NC",
    region: "Southeast",
    country: "United States",
    industry: "Asset & Wealth Management",
    employeeCount: 600,
    engineeringHeadcount: 60,
    revenueGrowthRate: 0.12,
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
    headquarters: "Springfield, MA",
    region: "Northeast",
    country: "United States",
    industry: "Asset & Wealth Management",
    employeeCount: 1800,
    engineeringHeadcount: 180,
    revenueGrowthRate: 0.05,
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
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Asset & Wealth Management",
    employeeCount: 350,
    engineeringHeadcount: 35,
    revenueGrowthRate: 0.15,
    revenueModel: "Private markets: management fees + carried interest (PE, private credit)",
    financialHighlights: [
      { label: "AUM", value: "$38B" },
      { label: "Active funds", value: "11" },
      { label: "Portfolio companies", value: "64" },
    ],
    sourceNotes: DEMO_NOTE,
  },

  // ── Real Fortune 500 financial-services firms (placeholder financials) ───────
  // Diversified banks
  {
    name: "JPMorgan Chase",
    domain: "jpmorganchase.com",
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Banking & Capital Markets",
    employeeCount: 310_000,
    engineeringHeadcount: 55_000,
    revenueGrowthRate: 0.06,
    revenueModel:
      "Diversified bank: consumer & community banking, corporate & investment bank, asset & wealth management",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$160B" },
      { label: "Total assets", value: "~$3.9T" },
      { label: "Net income", value: "~$50B" },
      { label: "Employees", value: "~310,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  {
    name: "Bank of America",
    domain: "bankofamerica.com",
    headquarters: "Charlotte, NC",
    region: "Southeast",
    country: "United States",
    industry: "Banking & Capital Markets",
    employeeCount: 213_000,
    engineeringHeadcount: 40_000,
    revenueGrowthRate: 0.04,
    revenueModel:
      "Diversified bank: consumer banking, global markets, wealth management (Merrill)",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$100B" },
      { label: "Total assets", value: "~$3.2T" },
      { label: "Net income", value: "~$27B" },
      { label: "Employees", value: "~213,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  {
    name: "Wells Fargo",
    domain: "wellsfargo.com",
    headquarters: "San Francisco, CA",
    region: "West",
    country: "United States",
    industry: "Banking & Capital Markets",
    employeeCount: 226_000,
    engineeringHeadcount: 35_000,
    revenueGrowthRate: 0.03,
    revenueModel:
      "Diversified bank: consumer & commercial banking, wealth & investment management",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$82B" },
      { label: "Total assets", value: "~$1.9T" },
      { label: "Net income", value: "~$19B" },
      { label: "Employees", value: "~226,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  // Investment banks
  {
    name: "Goldman Sachs",
    domain: "goldmansachs.com",
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Investment Banking",
    employeeCount: 46_000,
    engineeringHeadcount: 12_000,
    revenueGrowthRate: 0.07,
    revenueModel:
      "Investment bank: global banking & markets, asset & wealth management, platform solutions",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$53B" },
      { label: "Total assets", value: "~$1.6T" },
      { label: "Net income", value: "~$11B" },
      { label: "Employees", value: "~46,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  {
    name: "Morgan Stanley",
    domain: "morganstanley.com",
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Investment Banking",
    employeeCount: 80_000,
    engineeringHeadcount: 15_000,
    revenueGrowthRate: 0.08,
    revenueModel:
      "Investment bank + wealth: institutional securities, wealth management, investment management",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$54B" },
      { label: "Wealth client assets", value: "~$5T" },
      { label: "Net income", value: "~$10B" },
      { label: "Employees", value: "~80,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  // Trading / brokerage
  {
    name: "Charles Schwab",
    domain: "schwab.com",
    headquarters: "Westlake, TX",
    region: "South",
    country: "United States",
    industry: "Brokerage & Trading",
    employeeCount: 32_000,
    engineeringHeadcount: 6_000,
    revenueGrowthRate: 0.09,
    revenueModel:
      "Brokerage & banking: net interest income, asset-management & advice fees, trading",
    financialHighlights: [
      { label: "Client assets", value: "~$8.5T" },
      { label: "Revenue (FY)", value: "~$19B" },
      { label: "Active brokerage accounts", value: "~35M" },
      { label: "Employees", value: "~32,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  // Credit union (member-owned, not F500-ranked)
  {
    name: "Navy Federal Credit Union",
    domain: "navyfederal.org",
    headquarters: "Vienna, VA",
    region: "Mid-Atlantic",
    country: "United States",
    industry: "Banking — Credit Union",
    employeeCount: 24_000,
    engineeringHeadcount: 3_000,
    revenueGrowthRate: 0.07,
    revenueModel:
      "Member-owned, not-for-profit credit union: consumer banking & lending for the military community",
    financialHighlights: [
      { label: "Members", value: "~13M" },
      { label: "Total assets", value: "~$170B" },
      { label: "Branches", value: "~360" },
      { label: "Employees", value: "~24,000" },
    ],
    sourceNotes:
      "Illustrative seed — member-owned credit union (not F500-ranked); placeholder figures, NOT sourced; confirm before presenting",
  },
  // Asset / wealth manager
  {
    name: "BlackRock",
    domain: "blackrock.com",
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Asset & Wealth Management",
    employeeCount: 20_000,
    engineeringHeadcount: 6_000,
    revenueGrowthRate: 0.1,
    revenueModel:
      "Asset manager: management fees on index & active funds (iShares) plus Aladdin technology services",
    financialHighlights: [
      { label: "AUM", value: "~$10T" },
      { label: "Revenue (FY)", value: "~$18B" },
      { label: "Net income", value: "~$6B" },
      { label: "Employees", value: "~20,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  // Payments / card networks
  {
    name: "Visa",
    domain: "visa.com",
    headquarters: "San Francisco, CA",
    region: "West",
    country: "United States",
    industry: "Payments & Card Networks",
    employeeCount: 28_000,
    engineeringHeadcount: 12_000,
    revenueGrowthRate: 0.1,
    revenueModel:
      "Payments network: data-processing & service fees on transaction volume (no consumer lending)",
    financialHighlights: [
      { label: "Revenue (FY)", value: "~$33B" },
      { label: "Total payments volume", value: "~$15T" },
      { label: "Operating margin", value: "~65%" },
      { label: "Employees", value: "~28,000" },
    ],
    sourceNotes: SEED_NOTE,
  },
  {
    name: "American Express",
    domain: "americanexpress.com",
    headquarters: "New York, NY",
    region: "Northeast",
    country: "United States",
    industry: "Payments & Card Networks",
    employeeCount: 74_000,
    engineeringHeadcount: 10_000,
    revenueGrowthRate: 0.09,
    revenueModel:
      "Card network + lender: discount revenue, card fees, net interest income on card balances",
    financialHighlights: [
      { label: "Revenue (FY, net)", value: "~$60B" },
      { label: "Cards in force", value: "~140M" },
      { label: "Net income", value: "~$10B" },
      { label: "Employees", value: "~74,000" },
    ],
    sourceNotes: SEED_NOTE,
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
