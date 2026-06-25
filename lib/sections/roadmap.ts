import type { ProposalContext, SectionOutput } from "@/lib/types";
import { fmtPercent } from "@/lib/format";

/**
 * Phased implementation — pilot → expand → scale — tied directly to the
 * adoption-breadth ramp so the plan and the economics share one source of
 * truth.
 */
export function roadmapSection(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases } = ctx;
  const phases = ["Pilot", "Expand", "Scale", "Optimize", "Extend"];

  const rows = a.adoptionBreadth.map((p, i) => {
    const phase = phases[Math.min(i, phases.length - 1)];
    const target = `${fmtPercent(p.base)} of ${a.targetUserCount.toLocaleString("en-US")} users`;
    return [phase, `Year ${p.year}`, target, focusFor(i, selectedUseCases.length)];
  });

  return {
    id: "roadmap",
    kind: "roadmap",
    title: "Roadmap",
    subtitle: "Phases map one-to-one onto the adoption ramp the economics are built on",
    bullets: [
      `These adoption targets are the SAME numbers driving the cost and value forecasts — move a slider, this table moves`,
    ],
    table: {
      columns: ["Phase", "Timeframe", "Adoption target", "Focus"],
      rows,
    },
    speakerNotes:
      `Pilot proves the workflow with the people who own it; expansion follows demonstrated value, not a mandate; consumption ` +
      `pricing makes the ramp self-regulating, so spend follows real usage at every phase. Anchor each phase gate on observed ` +
      `usage, not calendar: expansion triggers when pilot-cohort weekly-active and hours-returned metrics hold for a month. The ` +
      `ramp numbers are the audit trail — the same assumptions object feeds this table and every chart in the deck.`,
    assumptionsUsed: ["adoptionBreadth", "targetUserCount"],
    order: 0,
    enabled: true,
  };
}

function focusFor(phaseIndex: number, useCaseCount: number): string {
  if (phaseIndex === 0)
    return `2 highest-confidence use cases, named pilot cohort, success metrics agreed up front`;
  if (phaseIndex === 1)
    return `Roll out remaining ${Math.max(useCaseCount - 2, 0)} use cases; champions program; integrate into systems of record`;
  if (phaseIndex === 2)
    return `Org-wide availability; embed into daily workflows; SSO + governance at scale`;
  if (phaseIndex === 3)
    return `Model-mix tuning for cost/quality; SLAs and guardrails on agency use cases`;
  return `New use-case intake process; expand to adjacent teams and functions`;
}
