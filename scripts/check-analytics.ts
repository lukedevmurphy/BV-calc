import assert from "node:assert";
import { aggregateProposalAnalytics } from "@/lib/analytics/proposals";
import { isAdminEmail } from "@/lib/auth/admin";
import { DEFAULT_ASSUMPTIONS, DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import { computeAllSections, defaultSectionConfig } from "@/lib/sections/index";
import { CURRENT_PROPOSAL_SCHEMA_VERSION } from "@/lib/proposals/migrate";
import type { CompanyProfile, ProposalPayload } from "@/lib/types";

const makePayload = (company: CompanyProfile): ProposalPayload => ({
  schemaVersion: CURRENT_PROPOSAL_SCHEMA_VERSION,
  revision: 1,
  company,
  assumptions: DEFAULT_ASSUMPTIONS,
  selectedUseCaseIds: SEED_USE_CASES.slice(0, 4).map((useCase) => useCase.id),
  valueModel: DEFAULT_VALUE_MODEL,
  sectionConfig: defaultSectionConfig(),
  sections: computeAllSections({
    company,
    assumptions: DEFAULT_ASSUMPTIONS,
    selectedUseCases: SEED_USE_CASES.slice(0, 4),
    valueModel: DEFAULT_VALUE_MODEL,
    sectionConfig: defaultSectionConfig(),
  }),
});

const rows = [
  {
    id: "one",
    companyName: "Alpha",
    payload: makePayload({
      name: "Alpha",
      industry: "Banking",
      region: "Northeast",
      country: "United States",
      headquarters: "New York, NY",
    }),
    createdAt: new Date("2026-05-10T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
  },
  {
    id: "two",
    companyName: "Beta",
    payload: makePayload({
      name: "Beta",
      industry: "Banking",
      region: "West",
      country: "United States",
      headquarters: "San Francisco, CA",
    }),
    createdAt: new Date("2026-06-10T00:00:00Z"),
    updatedAt: new Date("2026-06-12T00:00:00Z"),
  },
];

const analytics = aggregateProposalAnalytics(rows);
assert.strictEqual(analytics.summary.caseCount, 2);
assert(analytics.summary.totalValue > analytics.summary.totalCost);
assert.strictEqual(analytics.timeline.length, 2);
assert.strictEqual(analytics.byIndustry[0].caseCount, 2);
assert.strictEqual(analytics.byRegion.length, 2);
assert.strictEqual(analytics.byCountry[0].caseCount, 2);
assert.strictEqual(analytics.recentCases[0].companyName, "Beta");
assert(isAdminEmail("MURPHYUSC@GMAIL.COM"), "admin comparison is case-insensitive");
assert(!isAdminEmail("someone@example.com"), "non-admin email is rejected");

console.log("Analytics aggregation, segmentation, timeline, and admin allowlist hold. ✓");
