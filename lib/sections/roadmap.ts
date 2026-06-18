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
      `The adoption targets below are the SAME numbers driving the cost and value forecasts — moving a slider moves this table`,
      `Pilot proves the workflow with the people who own it; expansion follows demonstrated value, not a mandate`,
      `Consumption pricing makes the ramp self-regulating: spend follows real usage at every phase`,
    ],
    table: {
      columns: ["Phase", "Timeframe", "Adoption target", "Focus"],
      rows,
    },
    speakerNotes:
      `Anchor each phase gate on observed usage, not calendar: expansion triggers when pilot cohort weekly-active and ` +
      `hours-returned metrics hold for a month. The ramp numbers are the audit trail — the same assumptions object feeds ` +
      `this table and every chart in the deck.`,
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
  return `Org-wide availability, model-mix tuning for cost/quality, new use-case intake process`;
}
