import type { ProposalContext, SectionOutput } from "@/lib/types";
import { mul, scale, sum } from "@/lib/economics/ranged";
import { fmtNumber, fmtRangeTriple } from "@/lib/format";

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
    subtitle: `${fmtNumber(hoursPerYearAllUsers.base)} expert hours a year go into work Claude can do`,
    stats: [
      {
        label: "Hours absorbed / user / month",
        value: fmtRangeTriple(hoursPerUserPerMonth, (n) => `${n.toFixed(1)}h`),
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
      `Each workflow is performed manually today: gather sources, synthesize, draft, format, re-check — by people hired for ` +
      `judgment, not assembly. Cycle times are bounded by the calendar availability of experts, not the difficulty of the work; ` +
      `quality varies by author and time pressure; institutional knowledge is re-derived instead of reused. Scaling output means ` +
      `scaling headcount linearly — there is no operating leverage in the current model. The status-quo hours here are the same ` +
      `sizing knobs the Business Value section monetizes, so the value build feels like arithmetic, not a claim. Validate the hours ` +
      `with the people who do the work, not their managers.`,
    assumptionsUsed: [
      "targetUserCount",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser)",
    ],
    order: 0,
    enabled: true,
  };
}
