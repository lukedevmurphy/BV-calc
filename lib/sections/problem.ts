import type { ProposalContext, SectionOutput } from "@/lib/types";
import { fmtNumber } from "@/lib/format";

/**
 * The business problem — deterministic template assembled from the company
 * profile and selected use cases. Structured as slide-ready bullets plus
 * stat callouts; never paragraphs.
 */
export function problemSection(ctx: ProposalContext): SectionOutput {
  const { company, selectedUseCases, assumptions } = ctx;
  const industry = company.industry ?? "the industry";
  const workstreams = selectedUseCases.map((u) => u.label.toLowerCase());

  const bullets: string[] =
    workstreams.length > 0
      ? [
          `Expert hours go to ${listPhrase(workstreams.slice(0, 3))} — repetitive synthesis that pulls people hired for judgment onto assembly work`,
        ]
      : [
          `Expert hours go to repetitive synthesis and drafting — pulling people hired for judgment onto assembly work`,
        ];

  const stats = [
    ...(company.employeeCount
      ? [{ label: "Employees", value: fmtNumber(company.employeeCount) }]
      : []),
    {
      label: "Target users in scope",
      value: fmtNumber(assumptions.targetUserCount),
    },
    {
      label: "Workflows addressed",
      value: String(selectedUseCases.length),
    },
  ];

  return {
    id: "problem",
    kind: "problem",
    title: "The Problem",
    subtitle: "Expert hours go to assembly, not judgment — and it scales only by hiring",
    bullets,
    stats,
    speakerNotes:
      `The constraint is not effort — it is that expert time is spent producing routine artifacts instead of exercising judgment. ` +
      `Knowledge work at ${company.name} is concentrated in high-skill, document-heavy workflows that scale only by adding headcount. ` +
      `Institutional knowledge lives in documents and inboxes; finding and reusing it is slow and inconsistent. ` +
      `Competitors in ${industry.toLowerCase()} are already compressing these cycle times with AI — the cost of waiting compounds. ` +
      `Frame the problem in the client's own language before any numbers, anchored on the selected workflows. ` +
      `If the profile was enriched, confirm employee count and industry with the client (the confirm/edit step exists for exactly this).`,
    assumptionsUsed: ["targetUserCount", "company profile (industry, employee count)"],
    order: 0,
    enabled: true,
  };
}

function listPhrase(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
