import type { ProposalContext, SectionOutput } from "@/lib/types";
import { annualValueByUseCase } from "@/lib/economics/engine";
import { fmtCurrency, fmtRange } from "@/lib/format";

/**
 * Value aligned to demand: maps each value driver to the concrete
 * demand/need it serves and the specific ask that unlocks it. Ties the
 * Business Value figures to asks rather than restating them.
 */
export function proposalSection(ctx: ProposalContext): SectionOutput {
  const { company, assumptions: a, selectedUseCases } = ctx;
  const byUseCase = annualValueByUseCase(a, selectedUseCases, a.horizonYears);
  const totalValue = ctx.priorSections.business_value?.rangedFigures?.annualValueFinalYear;

  return {
    id: "proposal",
    kind: "proposal",
    title: "The Proposal",
    subtitle: `Each value driver tied to the specific demand it serves — and what it needs from ${company.name}`,
    bullets: [
      `Nothing below is generic AI enthusiasm: every row pairs a workflow you run today with the value it returns and the ask that unlocks it`,
      totalValue
        ? `Total annual value at maturity: ${fmtCurrency(totalValue.base)} — the asks are small relative to what they unlock`
        : `The asks are small relative to the value they unlock`,
      `The first ask is not budget — it is access: the documents, the systems, and two hours a week from the people who do the work`,
    ],
    table: {
      columns: ["Value driver", `Annual value (Y${a.horizonYears})`, "Serves the demand for", "What it needs"],
      rows: byUseCase.map(({ useCase, value }) => [
        useCase.label,
        fmtRange(value),
        demandFor(useCase.id),
        askFor(useCase.id),
      ]),
    },
    speakerNotes:
      `This is where the proposal earns the meeting: value mapped to named demands, each with a concrete unlock. ` +
      `Read the table column by column, not row by row — first establish the demands are real, then the asks look obviously cheap.`,
    assumptionsUsed: [
      "per-use-case value (from Business Value)",
      `horizonYears (${a.horizonYears})`,
    ],
    order: 0,
    enabled: true,
  };
}

function demandFor(id: string): string {
  const map: Record<string, string> = {
    "awm-meeting-prep": "More client-facing hours per advisor",
    "awm-rfp-ddq": "Faster institutional sales cycles",
    "awm-research-synthesis": "Broader coverage without analyst adds",
    "awm-portfolio-commentary": "Consistent, on-time client communication",
    "awm-kyc-onboarding": "Faster onboarding, lower ops backlog",
    "awm-reg-monitoring": "Regulatory confidence without compliance sprawl",
    "awm-pitch-books": "More at-bats for the distribution team",
    "awm-performance-qa": "Same-day client answers at scale",
  };
  return map[id] ?? "Capacity in a constrained team";
}

function askFor(id: string): string {
  const map: Record<string, string> = {
    "awm-meeting-prep": "CRM + meeting-history access; 5 pilot advisors",
    "awm-rfp-ddq": "Library of past RFP/DDQ responses",
    "awm-research-synthesis": "Research platform entitlements for the pilot",
    "awm-portfolio-commentary": "Two quarters of past commentary as exemplars",
    "awm-kyc-onboarding": "Sample onboarding files + checklist owner",
    "awm-reg-monitoring": "Current obligations register",
    "awm-pitch-books": "Brand templates + three recent winning decks",
    "awm-performance-qa": "Read access to performance/attribution data",
  };
  return map[id] ?? "A workflow owner and sample artifacts";
}
