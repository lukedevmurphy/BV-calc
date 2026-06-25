import type { ProposalContext, SectionOutput } from "@/lib/types";
import { illustrativeFlag, showDraftWarnings } from "@/lib/provenance";
import { RATIO_CEILING, ratioPlausible } from "@/lib/economics/ranged";
import { fmtCurrency, fmtNumber, fmtRange } from "@/lib/format";

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
  const coding = priorSections.coding_efficiency?.rangedFigures?.codingTotalFinalYear;
  const itTakeout = priorSections.it_takeout?.rangedFigures?.itTakeoutFinalYear;
  const cost = priorSections.cost?.rangedFigures?.annualCostFinalYear;
  const net = priorSections.forecast?.rangedFigures?.netFinalYear;
  const roi = priorSections.forecast?.rangedFigures?.roiFinalYear;
  const breakEvenStat = priorSections.cost?.stats?.find(
    (s) => s.label === "Break-even period",
  );

  // One exhibit (the value strip) + one ask. Everything that used to be a
  // narration bullet is mechanically restated by the detail sections, so it
  // moves to speaker notes; the slide carries only the decision.
  const roiOk = roi ? ratioPlausible(roi.base) : true;
  const draft = showDraftWarnings(a);
  const bullets: string[] = [
    `The ask this quarter: validate the sizing with practitioners and name a 2-use-case pilot — no signed contract, no budget line`,
  ];
  // Credibility flags — draft mode only; never on a client-facing slide.
  if (draft && roi && !roiOk) {
    bullets.push(
      `⚠ Value-to-cost ratio (~${fmtNumber(roi.base)}×) exceeds the plausible ceiling (~${RATIO_CEILING}×) — likely cost is understated or value overstated; revisit token volumes, adoption and model mix before presenting`,
    );
  }
  const flag = draft ? illustrativeFlag(company) : null;
  if (flag) bullets.push(flag);

  const codingNote =
    coding && coding.base > 1
      ? ` Of that, engineering coding efficiency contributes ${fmtRange(coding)}.`
      : "";
  const itNote =
    itTakeout && itTakeout.base > 1
      ? ` IT cost takeout adds ${fmtRange(itTakeout)} (hard-dollar run-rate on a sunset schedule).`
      : "";

  return {
    id: "executive_summary",
    kind: "executive_summary",
    title: "Executive Summary",
    subtitle: value
      ? `${company.name}: ${fmtCurrency(value.base)} of annual AI value by Year ${a.horizonYears} — for a fraction of the cost`
      : `AI leverage for ${company.name}'s knowledge workflows — ranged, auditable, consumption-priced`,
    bullets,
    // Hero is the value strip (annual value — the deck's anchor number). The
    // trio below is the rest of the decision: what it costs, the net, and when
    // it pays back. Ratio / coding / IT detail lives in the appendix.
    stats: [
      ...(cost ? [{ label: `Annual cost, Y${a.horizonYears}`, value: fmtRange(cost) }] : []),
      ...(net ? [{ label: `Net value, Y${a.horizonYears}`, value: fmtRange(net) }] : []),
      ...(breakEvenStat ? [{ label: "Break-even", value: breakEvenStat.value }] : []),
    ],
    speakerNotes:
      `${selectedUseCases.length} workflows at ${company.name} burn expert hours on assembly work that Claude now does — sized ` +
      `bottom-up with ${company.name}'s own volumes, not a top-down percentage.` +
      (value ? ` Annual value at maturity (Year ${a.horizonYears}): ${fmtRange(value)} — every figure a conservative/base/optimistic range.` : "") +
      codingNote +
      itNote +
      (cost ? ` Annual consumption cost at the same point: ${fmtRange(cost)} — cost rises with adoption by design; the value-to-cost gap is the business case.` : "") +
      (roi && !roiOk ? ` Note: the value-to-cost ratio (~${fmtNumber(roi.base)}×) is above the credible ceiling (~${RATIO_CEILING}×) — pressure-test cost before a client readout.` : "") +
      ` Every number on this slide is assembled mechanically from the sections that follow — nothing is restated by hand, ` +
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
