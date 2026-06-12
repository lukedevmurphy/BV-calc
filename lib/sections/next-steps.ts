import type { ProposalContext, SectionOutput } from "@/lib/types";

/** Concrete asks and actions — who does what, in what order. */
export function nextStepsSection(ctx: ProposalContext): SectionOutput {
  const { company } = ctx;

  return {
    id: "next_steps",
    kind: "next_steps",
    title: "Next Steps",
    subtitle: "Two weeks of concrete actions — none of them require a signed contract",
    bullets: [
      `Validate the sizing: 30 minutes with one practitioner per workflow to pressure-test hours-saved and volume assumptions`,
      `Name the pilot: 2 use cases, a cohort of named users, and the success metrics that gate expansion`,
      `Confirm current Claude model pricing and the latest pre-built template list — both are placeholders in this draft by design`,
      `Security & data review: route the data-access asks from the Proposal section to the right owners at ${company.name}`,
      `Reconvene with the updated numbers: this deck recomputes from the revised assumptions in minutes, not weeks`,
    ],
    speakerNotes:
      `End on the smallest possible yes: the sizing-validation sessions. They cost the client almost nothing, they improve ` +
      `the model either direction, and they create the practitioner champions the pilot needs. The deck's auditability is ` +
      `the close — every number traces to an assumption they can change in front of you.`,
    assumptionsUsed: [],
    order: 0,
    enabled: true,
  };
}
