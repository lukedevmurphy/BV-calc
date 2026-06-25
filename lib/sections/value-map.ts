import type { ProposalContext, RankedValue, SectionOutput } from "@/lib/types";
import {
  DRIVER_ORDER,
  VALUE_DRIVERS,
  driversForUseCase,
  type DriverId,
} from "@/lib/value-model/drivers";
import { perDriverValues } from "@/lib/value-model/driver-rollup";
import { resolveSubIndustry, sectorDriverLabel } from "@/lib/value-model/sub-industry";
import { showDraftWarnings } from "@/lib/provenance";
import { fmtCurrency } from "@/lib/format";

/** The selected use cases that feed a driver, summarized for the value-map's
 *  narrow left column: list them when ≤5, otherwise the first four + "+N more"
 *  so the row never squishes. Folded drivers (coding / IT takeout) have no use
 *  cases — the caller falls back to the strategic objective. */
function capabilityLine(ctx: ProposalContext, d: DriverId): string {
  const names = ctx.selectedUseCases
    .filter((uc) => driversForUseCase(uc).includes(d))
    .map((uc) => uc.label);
  if (names.length === 0) return DRIVER_STRATEGY[d].objective;
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 4).join(", ")} + ${names.length - 4} more use cases`;
}

/**
 * Sector-typical strategic framing per driver — ILLUSTRATIVE. A real enrichment
 * pass populates company-specific goals from the website / latest 10-K/10-Q; the
 * value map labels them as placeholders to confirm. Nothing here is sourced.
 */
const DRIVER_STRATEGY: Record<DriverId, { goal: string; objective: string }> = {
  productivity: { goal: "Improve operating efficiency", objective: "Lower cost-to-serve / expense ratio" },
  revenue_growth: { goal: "Accelerate profitable growth", objective: "Raise producer capacity & win-rate" },
  cross_sell: { goal: "Deepen client relationships", objective: "Grow share of wallet / fee income" },
  onboarding_speed: { goal: "Elevate the client experience", objective: "Cut time-to-onboard / time-to-value" },
  risk_compliance: { goal: "Strengthen risk & control", objective: "Reduce loss events & compliance cost" },
  coding_efficiency: { goal: "Increase engineering throughput", objective: "Ship faster / lower delivery cost" },
  it_takeout: { goal: "Rationalize the technology estate", objective: "Decommission legacy applications" },
};

/**
 * Value Map — the bridge from strategy to numbers, in the main deck just before
 * Business Value. A number-first ranked exhibit: each active value driver as a
 * share-scaled bar (sorted high→low) with its company goal as the quiet support
 * chain. Driver totals tie to the Business Value headline (shared rollup). The
 * action title states the conclusion — one driver dominates, the rest are upside.
 */
export function valueMapSection(ctx: ProposalContext): SectionOutput {
  const finalYear = ctx.assumptions.horizonYears;
  const subId = resolveSubIndustry(ctx.company.industry).id;
  const perDriver = perDriverValues(ctx);
  const active = DRIVER_ORDER.filter((d) => perDriver[d] > 1).sort(
    (a, b) => perDriver[b] - perDriver[a],
  );
  const total = active.reduce((sum, d) => sum + perDriver[d], 0);

  // Each row reads left→right: the company goal (capability) + the use cases
  // that deliver it, a share-scaled bar, then the value driver quantified on the
  // right. The driver name moves to the value caption so the LEFT carries the
  // strategy and the RIGHT carries the number.
  const rankedValue: RankedValue = {
    rows: active.map((d) => ({
      label: DRIVER_STRATEGY[d].goal,
      chain: [capabilityLine(ctx, d)],
      valueNote: sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short),
      value: perDriver[d],
      share: total > 0 ? perDriver[d] / total : 0,
    })),
    total: { value: total, label: `${fmtCurrency(total)}  total annual value (Y${finalYear})` },
    format: "currency",
  };

  // Action title = the conclusion: the largest driver and its share of the case.
  const top = active[0];
  const topShare = top && total > 0 ? perDriver[top] / total : 0;
  const topLabel = top ? sectorDriverLabel(subId, top, VALUE_DRIVERS[top].short) : "";
  const subtitle =
    active.length > 1
      ? `${topLabel} is ~${Math.round(topShare * 100)}% of the value — the other ${active.length - 1} drivers are upside on top`
      : `${topLabel} drives the value case`;

  // Goal → objective mapping (illustrative) lives in notes; the slide carries the
  // number-first exhibit, not the strategy prose.
  const objectiveLines = active
    .map((d) => `${DRIVER_STRATEGY[d].goal} → ${DRIVER_STRATEGY[d].objective}`)
    .join("; ");

  return {
    id: "value_map",
    kind: "value_map",
    title: "Value Map",
    subtitle,
    rankedValue,
    // The illustrative-goals caveat is demoted from a left-column bullet (which
    // squished the exhibit into half-width) to a quiet footnote, so the ranked
    // exhibit reads full-width. Draft only; client mode drops it.
    footnote: showDraftWarnings(ctx.assumptions)
      ? "Goals are illustrative / sector-typical — confirm against the company's stated strategy and latest 10-K/10-Q before presenting."
      : undefined,
    speakerNotes:
      `${active.length} value drivers map to the company's strategic goals — ${fmtCurrency(total)} total annual value at Year ${finalYear}. ` +
      "Each driver traces from a company goal, through the strategic objective it serves, to a quantified value driver, so the case is " +
      `aligned to the business, not just the technology. Goal → objective (illustrative): ${objectiveLines}. ` +
      "These goals are sector-typical placeholders — a real enrichment pass would populate them from the company's website and latest " +
      "10-K/10-Q; confirm with the client. Driver totals tie to the Business Value headline.",
    assumptionsUsed: [
      "selected use cases → value drivers (taxonomy)",
      "per-driver value (use-case rollup + coding + IT takeout)",
      "strategic goals / objectives (illustrative — confirm vs 10-K/10-Q)",
      `horizonYears (${finalYear})`,
    ],
    order: 0,
    enabled: true,
  };
}
