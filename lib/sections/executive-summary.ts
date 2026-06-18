import type { ProposalContext, SectionOutput } from "@/lib/types";
import { illustrativeFlag } from "@/lib/provenance";
import { RATIO_CEILING, ratioPlausible } from "@/lib/economics/ranged";
import { fmtNumber, fmtRange } from "@/lib/format";

/**
 * Generated LAST, by deterministic assembly only. Reads exclusively from
 * priorSections' rangedFigures and headline stats — it touches no engine
 * function, so it can never contradict the numbers in the sections below it.
 * (An optional AI polish pass is deliberately out of v1; it would slot in as
 * a separate server route that may rephrase but never introduce numbers.)
 */
export function executiveSummarySection(ctx: ProposalContext): SectionOutput {
  const { company, assumptions: a, selectedUseCases, priorSections } = ctx;

  const value = priorSections.business_value?.rangedFigures?.annualValueFinalYear;
  const cost = priorSections.cost?.rangedFigures?.annualCostFinalYear;
  const net = priorSections.forecast?.rangedFigures?.netFinalYear;
  const roi = priorSections.forecast?.rangedFigures?.roiFinalYear;
  const breakEvenStat = priorSections.cost?.stats?.find(
    (s) => s.label === "Break-even period",
  );

  const bullets: string[] = [
    `${selectedUseCases.length} workflows at ${company.name} burn expert hours on assembly work that Claude now does — sized bottom-up with ${company.name}'s own volumes, not a top-down percentage`,
  ];
  if (value) {
    bullets.push(
      `Annual value at maturity (Year ${a.horizonYears}): ${fmtRange(value)} — every figure a conservative/base/optimistic range, every range traceable to editable assumptions`,
    );
  }
  if (cost) {
    bullets.push(
      `Annual consumption cost at the same point: ${fmtRange(cost)} — cost rises with adoption by design; the value-to-cost gap is the business case, and cost is a wide range driven by implementation (see Cost)`,
    );
  }
  if (breakEvenStat) {
    bullets.push(
      `Break-even (including one-time implementation): ${breakEvenStat.value}`,
    );
  }
  // Ratio sanity (Part 4): an implausible value-to-cost ratio is a credibility
  // risk, not a hero number — warn instead of printing it as a headline.
  const roiOk = roi ? ratioPlausible(roi.base) : true;
  if (roi && !roiOk) {
    bullets.push(
      `⚠ Value-to-cost ratio (~${fmtNumber(roi.base)}×) exceeds the plausible ceiling (~${RATIO_CEILING}×) — likely cost is understated or value overstated; revisit token volumes, adoption and model mix before presenting`,
    );
  }
  bullets.push(
    `The ask this quarter: validate the sizing with practitioners and name a 2-use-case pilot cohort`,
  );
  // Carry the placeholder-financials caveat onto the headline slide so a seed
  // deck never reads as sourced — travels into the PPTX with the other bullets.
  const flag = illustrativeFlag(company);
  if (flag) bullets.push(flag);

  return {
    id: "executive_summary",
    kind: "executive_summary",
    title: "Executive Summary",
    subtitle: `AI leverage for ${company.name}'s knowledge workflows — ranged, auditable, consumption-priced`,
    bullets,
    stats: [
      ...(value ? [{ label: `Annual value, Y${a.horizonYears}`, value: fmtRange(value) }] : []),
      ...(cost ? [{ label: `Annual cost, Y${a.horizonYears}`, value: fmtRange(cost) }] : []),
      ...(net ? [{ label: `Net value, Y${a.horizonYears}`, value: fmtRange(net) }] : []),
      ...(roi
        ? [
            {
              label: "Value-to-cost ratio",
              value: roiOk
                ? fmtRange(roi, (n) => `${fmtNumber(n)}×`)
                : `⚠ ~${fmtNumber(roi.base)}× — review assumptions`,
            },
          ]
        : []),
    ],
    speakerNotes:
      `Every number on this slide is assembled mechanically from the sections that follow — nothing is restated by hand, ` +
      `so the summary cannot drift from the detail. If a figure looks wrong here, it is wrong in exactly one underlying ` +
      `assumption, and you can change it live.`,
    // Pass-through of the headline figures (read, not computed) so renderers
    // can draw a conservative/base/upside value strip without re-deriving.
    rangedFigures: {
      ...(value ? { annualValueFinalYear: value } : {}),
      ...(cost ? { annualCostFinalYear: cost } : {}),
      ...(net ? { netFinalYear: net } : {}),
    },
    assumptionsUsed: [
      "assembled from Business Value, Cost, and Forecast section outputs",
    ],
    order: 0,
    enabled: true,
  };
}
