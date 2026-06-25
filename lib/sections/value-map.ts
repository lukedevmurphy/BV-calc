import type { ProposalContext, SectionOutput, TableData } from "@/lib/types";
import {
  DRIVER_ORDER,
  VALUE_DRIVERS,
  driversForUseCase,
  type DriverId,
} from "@/lib/value-model/drivers";
import { perDriverValues } from "@/lib/value-model/driver-rollup";
import { resolveSubIndustry, sectorDriverLabel } from "@/lib/value-model/sub-industry";
import { fmtCurrency } from "@/lib/format";

/**
 * Sector-typical strategic framing per driver — ILLUSTRATIVE. A real enrichment
 * pass populates company-specific goals from the website / latest 10-K/10-Q; the
 * value map labels them as placeholders to confirm. Nothing here is sourced.
 */
const DRIVER_STRATEGY: Record<DriverId, { goal: string; objective: string; pool?: string }> = {
  productivity: { goal: "Improve operating efficiency", objective: "Lower cost-to-serve / expense ratio" },
  revenue_growth: { goal: "Accelerate profitable growth", objective: "Raise producer capacity & win-rate" },
  cross_sell: { goal: "Deepen client relationships", objective: "Grow share of wallet / fee income" },
  onboarding_speed: { goal: "Elevate the client experience", objective: "Cut time-to-onboard / time-to-value" },
  risk_compliance: { goal: "Strengthen risk & control", objective: "Reduce loss events & compliance cost" },
  coding_efficiency: {
    goal: "Increase engineering throughput",
    objective: "Ship faster / lower delivery cost",
    pool: "Engineering coding workflows (Claude Code)",
  },
  it_takeout: {
    goal: "Rationalize the technology estate",
    objective: "Decommission legacy applications",
    pool: "Legacy application portfolio",
  },
};

function useCasesForDriver(ctx: ProposalContext, driver: DriverId): string {
  const labels = ctx.selectedUseCases
    .filter((uc) => driversForUseCase(uc).includes(driver))
    .map((uc) => uc.label);
  if (labels.length === 0) return "";
  if (labels.length <= 2) return labels.join("; ");
  return `${labels.slice(0, 2).join("; ")} +${labels.length - 2} more`;
}

/**
 * Value Map — the bridge from strategy to numbers, in the main deck just before
 * Business Value. Aligns company goals → strategic objectives → AI use cases →
 * quantified value drivers, one row per active driver. Driver totals tie to the
 * Business Value headline (shared rollup).
 */
export function valueMapSection(ctx: ProposalContext): SectionOutput {
  const finalYear = ctx.assumptions.horizonYears;
  const subId = resolveSubIndustry(ctx.company.industry).id;
  const perDriver = perDriverValues(ctx);
  const active = DRIVER_ORDER.filter((d) => perDriver[d] > 1).sort(
    (a, b) => perDriver[b] - perDriver[a],
  );

  const rows = active.map((d) => {
    const s = DRIVER_STRATEGY[d];
    const middle = s.pool ?? (useCasesForDriver(ctx, d) || "Functional value pool");
    const driverLabel = sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short);
    return [s.goal, s.objective, middle, `${driverLabel} · ${fmtCurrency(perDriver[d])}`];
  });

  const total = active.reduce((sum, d) => sum + perDriver[d], 0);
  const goalCount = new Set(active.map((d) => DRIVER_STRATEGY[d].goal)).size;

  const table: TableData = {
    columns: ["Strategic goal", "Objective", "AI use cases", `Value driver (Y${finalYear})`],
    rows,
  };

  return {
    id: "value_map",
    kind: "value_map",
    title: "Value Map",
    subtitle: "Company goals → strategic objectives → AI use cases → quantified value drivers",
    narrative:
      "Every dollar of value traces from a company goal, through the strategic objective it serves and the AI use cases that deliver it, to a quantified value driver — so the case is aligned to the business, not just the technology.",
    bullets: [
      `${active.length} value drivers map to ${goalCount} strategic goals — ${fmtCurrency(total)} total annual value at Year ${finalYear}`,
      "Goals are illustrative / sector-typical — confirm against the company's stated strategy and latest 10-K/10-Q before presenting",
    ],
    table,
    speakerNotes:
      "The value map is the bridge from strategy to numbers: it lines up the company's goals and strategic objectives with the AI " +
      "use cases in the middle and the value drivers they create on the right, each carrying a dollar figure. The goals here are " +
      "sector-typical placeholders — a real enrichment pass would populate them from the company's website and latest 10-K/10-Q; " +
      "confirm them with the client. The driver totals tie to the Business Value headline.",
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
