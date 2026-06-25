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
      `Validate the sizing — 30 min per workflow with one practitioner each (BV team + workflow owners)`,
      `Name the pilot — 2 use cases, a named user cohort, success metrics that gate expansion (sponsor + champion)`,
      `Route the data-access asks to the right owners (security + data owners at ${company.name})`,
    ],
    speakerNotes:
      `Two more internal-prep actions sit behind these: confirm current Claude model pricing and the latest pre-built template ` +
      `list (both placeholders in this draft by design), and reconvene with the updated numbers — the deck recomputes from revised ` +
      `assumptions in minutes, not weeks. End on the smallest possible yes: the sizing-validation sessions. They cost the client ` +
      `almost nothing, improve the model either direction, and create the practitioner champions the pilot needs. The deck's ` +
      `auditability is the close — every number traces to an assumption they can change in front of you.`,
    assumptionsUsed: [],
    order: 0,
    enabled: true,
  };
}
