import type { ProposalContext, SectionOutput } from "@/lib/types";
import { mul, scale, sum } from "@/lib/economics/ranged";
import { fmtNumber, fmtRange, fmtRangeTriple } from "@/lib/format";

/** How the work is done today — pain points and the cost of the status quo. */
export function currentStateSection(ctx: ProposalContext): SectionOutput {
  const { company, selectedUseCases, assumptions: a } = ctx;

  // Hours currently absorbed per user per month across selected workflows —
  // the same sizing knobs the value build uses, surfaced as status-quo cost.
  const hoursPerUserPerMonth = sum(
    selectedUseCases.map((uc) =>
      mul(
        uc.hoursSavedPerInstance ?? { low: 0.25, base: 0.5, high: 1 },
        uc.instancesPerMonthPerUser ?? { low: 1, base: 2, high: 4 },
      ),
    ),
  );
  const hoursPerYearAllUsers = scale(hoursPerUserPerMonth, a.targetUserCount * 12);

  return {
    id: "current_state",
    kind: "current_state",
    title: "Current State",
    subtitle: `How this work gets done at ${company.name} today`,
    bullets: [
      `Each workflow below is performed manually: gather sources, synthesize, draft, format, re-check — by people hired for judgment, not assembly`,
      `Cycle times are bounded by calendar availability of experts, not by the difficulty of the work`,
      `Quality varies by author and time pressure; institutional knowledge is re-derived instead of reused`,
      `Scaling output today means scaling headcount linearly — there is no operating leverage in the current model`,
    ],
    stats: [
      {
        label: "Hours absorbed / user / month",
        value: fmtRangeTriple(hoursPerUserPerMonth, (n) => `${n.toFixed(1)}h`),
      },
      {
        label: "Hours / year across target users",
        value: fmtRange(hoursPerYearAllUsers, fmtNumber),
      },
    ],
    table: {
      columns: ["Workflow", "Who does it today", "Hours / instance", "Instances / user / mo"],
      rows: selectedUseCases.map((uc) => [
        uc.label,
        uc.personaHint ?? "—",
        uc.hoursSavedPerInstance ? fmtRangeTriple(uc.hoursSavedPerInstance, (n) => `${n}h`) : "—",
        uc.instancesPerMonthPerUser
          ? fmtRangeTriple(uc.instancesPerMonthPerUser, (n) => `${n}`)
          : "—",
      ]),
    },
    speakerNotes:
      `The status-quo hours here are the same sizing knobs the Business Value section monetizes — establishing them ` +
      `as today's reality first makes the value build feel like arithmetic, not a claim. Validate the hours with the ` +
      `people who do the work, not their managers.`,
    assumptionsUsed: [
      "targetUserCount",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser)",
    ],
    order: 0,
    enabled: true,
  };
}
