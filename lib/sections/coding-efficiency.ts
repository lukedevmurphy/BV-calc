import type {
  KeyValue,
  ProposalContext,
  Ranged,
  SectionOutput,
  TableData,
} from "@/lib/types";
import { codingValue, HOURS_PER_YEAR } from "@/lib/economics/coding";
import { fmtCurrency, fmtNumber, fmtPercent, fmtRange } from "@/lib/format";

/**
 * "Show your work" appendix slide for the coding-efficiency driver — the #1
 * enterprise AI use case, which the FS knowledge-worker catalog doesn't cover.
 * Freed engineering capacity is one pool, valued two ways and split by the
 * `allocation` slider (Settings): engineering cost-out vs reinvested growth.
 *
 * The realized total here folds into the Business Value headline (business-value
 * adds the same figure), so this slide is the audit trail, not a second count.
 * Computes in BOTH approaches (sized by engineering headcount, not use cases).
 * Omits itself when coding is unconfigured / negligible.
 */
export function codingEfficiencySection(ctx: ProposalContext): SectionOutput | null {
  const { assumptions: a } = ctx;
  const c = a.coding;
  if (!c) return null;

  const finalYear = a.horizonYears;
  const final = codingValue(c, a, finalYear);
  const y1 = codingValue(c, a, 1);
  if (final.total.base <= 1) return null; // unconfigured (no coders / zero gain)

  const costOutPct = Math.round(Math.min(1, Math.max(0, c.allocation)) * 100);
  const growthPct = 100 - costOutPct;
  const effPct = Math.round(c.efficiencyGain.base * 100);
  const timePct = Math.round(c.timeOnCodePct * 100);
  const baselinePct = Math.round(c.growthBaseline.base * 100);
  const steppedPct = Math.round(c.growthBaseline.base * c.growthStepUp * 100);

  // At a 100% cost-out posture the growth path is $0 — don't show an empty
  // revenue line that invites "so why mention it"; label the slide cost-out-only.
  const hasGrowth = growthPct > 0;

  const stats: KeyValue[] = [
    { label: `Freed eng hours (Y${finalYear})`, value: fmtRange(final.freedHours, fmtNumber) },
    { label: "→ Engineering cost savings", value: fmtRange(final.costSavings) },
    ...(hasGrowth
      ? [{ label: "→ Incremental revenue", value: fmtRange(final.revenueGrowth) }]
      : []),
    { label: `Blended coding value (Y${finalYear})`, value: fmtRange(final.total) },
  ];

  const table: TableData = {
    columns: ["Path", "Driver", `Annual value (Y${finalYear})`],
    rows: [
      [
        "Freed engineering capacity",
        `${fmtNumber(c.coders)} eng × ${timePct}% on code × ${effPct}% gain`,
        `${fmtNumber(final.freedHours.base)} hrs`,
      ],
      [
        "→ Engineering cost-out",
        `${costOutPct}% of capacity × ${fmtCurrency(c.engineeringLoadedCost.base)}/hr (realized)`,
        fmtCurrency(final.costSavings.base),
      ],
      ...(hasGrowth
        ? [
            [
              "→ Revenue growth",
              `${growthPct}% reinvested: ${baselinePct}%→${steppedPct}% growth on topline (realized)`,
              fmtCurrency(final.revenueGrowth.base),
            ],
          ]
        : []),
      ["Blended coding value", "", fmtCurrency(final.total.base)],
    ],
  };

  // No dedicated chart: coding already appears as its own bar in the Business
  // Value driver chart, and the → stats show the cost-out vs growth split — so
  // this "show your work" appendix slide stays table-driven (like value_calc)
  // and fits one slide.
  const rangedFigures: Record<string, Ranged> = {
    codingFreedHoursFinalYear: final.freedHours,
    codingCostSavingsFinalYear: final.costSavings,
    codingRevenueGrowthFinalYear: final.revenueGrowth,
    codingTotalFinalYear: final.total,
    codingTotalY1: y1.total,
  };

  return {
    id: "coding_efficiency",
    kind: "coding_efficiency",
    title: "Coding Efficiency",
    subtitle: hasGrowth
      ? `Freed engineering capacity, split ${costOutPct}% cost-out / ${growthPct}% growth`
      : `Freed engineering capacity — 100% engineering cost-out (no growth reinvestment)`,
    narrative: hasGrowth
      ? "AI coding assistance frees a measurable share of engineering hours. Those hours land as either avoided cost or reinvested growth — the split is a posture set on the Settings page."
      : "AI coding assistance frees a measurable share of engineering hours. At the current posture they land entirely as avoided engineering cost; reallocate toward growth on the Settings page.",
    bullets: [
      `Freed hours = ${fmtNumber(c.coders)} engineers × ~${timePct}% time on code × ${effPct}% efficiency gain × ${HOURS_PER_YEAR.toLocaleString("en-US")} hrs/yr, ramped by adoption`,
      `Engineering cost-out = freed hours × ${fmtCurrency(c.engineeringLoadedCost.base)}/hr (geo-adjusted), realized like any offset`,
      ...(hasGrowth
        ? [`Revenue growth = topline × baseline growth stepped ${baselinePct}%→${steppedPct}% — the incremental topline reinvested capacity buys`]
        : []),
      `At the current ${costOutPct}% cost-out posture the blended coding value is ${fmtCurrency(final.total.base)} (Y${finalYear})`,
    ],
    stats,
    table,
    rangedFigures,
    speakerNotes:
      `Coding is the #1 enterprise AI use case but isn't a knowledge-worker workflow, so it's modeled as its own driver — ` +
      `a different population (engineers) on a different basis (throughput, not task hours), additive to the use-case value and never double-counted. ` +
      `Even where AI writes 80–100% of the code, only a fraction of total engineer-TIME is freed (engineers also design, review, debug, meet) — ` +
      `hence the conservative ${effPct}% gain on the ~${timePct}% of time spent coding. Cost-out books freed hours at the loaded rate (offset realization); ` +
      `growth assumes reinvested capacity lifts the baseline growth rate by the step-up factor (capacity realization). The allocation slider on Settings ` +
      `moves value between the two paths; the blended total folds into the Business Value headline.`,
    assumptionsUsed: [
      "coding.coders",
      "coding.timeOnCodePct",
      "coding.efficiencyGain (estimate — pressure-test vs measured throughput)",
      "coding.engineeringLoadedCost (geo-adjusted)",
      "coding.topline",
      "coding.growthBaseline",
      "coding.growthStepUp",
      "coding.allocation",
      "adoptionBreadth (ramps the freed hours)",
      "value realization (offset for cost-out, capacity for growth)",
      `horizonYears (${finalYear})`,
    ],
    order: 0,
    enabled: true,
  };
}
