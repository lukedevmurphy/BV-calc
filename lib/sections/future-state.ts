import type { ProposalContext, SectionOutput, UseCase } from "@/lib/types";

/** The to-be workflow, framed by each use case's automation/augmentation/agency tag. */
export function futureStateSection(ctx: ProposalContext): SectionOutput {
  const { company, selectedUseCases } = ctx;

  return {
    id: "future_state",
    kind: "future_state",
    title: "Future State",
    subtitle: `The same work at ${company.name}, restructured around AI leverage`,
    bullets: [
      `First drafts, synthesis, and document review move to Claude; experts move to review, judgment, and client time`,
      `Cycle times drop from days to hours — the constraint becomes decision quality, not production capacity`,
      `Output becomes consistent: the same standards, sources, and disclosures applied every time`,
      `Capacity scales with usage, not headcount — consumption pricing means leverage, not licenses`,
    ],
    table: {
      columns: ["Workflow", "Mode", "To-be operating pattern"],
      rows: selectedUseCases.map((uc) => [uc.label, modeOf(uc), toBePattern(uc)]),
    },
    narrative: `The future state is not "fewer people" — it is the same experts spending their hours where judgment differentiates.`,
    speakerNotes:
      `Walk one workflow end-to-end in the to-be pattern. The automation/augmentation/agency framing sets expectations ` +
      `honestly: automation rows ship fastest, agency rows need guardrails and earn trust over the roadmap phases.`,
    assumptionsUsed: ["selected use cases and their tags"],
    order: 0,
    enabled: true,
  };
}

function modeOf(uc: UseCase): string {
  if (uc.tags?.includes("agency")) return "Agency";
  if (uc.tags?.includes("automation")) return "Automation";
  return "Augmentation";
}

function toBePattern(uc: UseCase): string {
  if (uc.tags?.includes("agency"))
    return "An agent handles the request end-to-end within guardrails; humans audit outcomes";
  if (uc.tags?.includes("automation"))
    return "Claude produces the complete draft from source documents; a human reviews and approves";
  return "Claude assembles and synthesizes the inputs; the expert directs, refines, and decides";
}
