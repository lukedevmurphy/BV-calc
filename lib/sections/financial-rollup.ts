import type {
  KeyValue,
  ProposalContext,
  SectionOutput,
  TableData,
} from "@/lib/types";
import { DRIVER_ORDER, VALUE_DRIVERS, type DriverId } from "@/lib/value-model/drivers";
import { perDriverValues, perOutcomeValues } from "@/lib/value-model/driver-rollup";
import { resolveSubIndustry, sectorDriverLabel } from "@/lib/value-model/sub-industry";
import { fmtCurrency } from "@/lib/format";

/** Each driver's primary income-statement line — the CFO rollup. */
const DRIVER_PL_LINE: Record<DriverId, string> = {
  productivity: "Operating expense ↓ (efficiency)",
  revenue_growth: "Revenue ↑",
  cross_sell: "Revenue ↑ (fee income)",
  onboarding_speed: "Revenue ↑ (faster) + Opex ↓",
  risk_compliance: "Provisions / losses ↓",
  coding_efficiency: "Opex ↓ (engineering) + Revenue ↑",
  it_takeout: "Operating expense ↓ (technology)",
};

/**
 * Appendix slide for the finance partner: how each AI value driver rolls up to a
 * specific income-statement line (revenue, operating expense, or losses), totalled
 * to a pre-tax P&L impact. Answers the recurring CFO question — "where is the AI
 * actually making the value?" — in numbers finance can own. The total ties to the
 * Business Value headline (shared rollup).
 */
export function financialRollupSection(ctx: ProposalContext): SectionOutput {
  const finalYear = ctx.assumptions.horizonYears;
  const subId = resolveSubIndustry(ctx.company.industry).id;
  const perDriver = perDriverValues(ctx);
  const out = perOutcomeValues(ctx);
  const total = out.revenue + out.margin + out.loss_avoidance;
  const lineCount = [out.revenue, out.margin, out.loss_avoidance].filter((v) => v > 1).length;

  const active = DRIVER_ORDER.filter((d) => perDriver[d] > 1).sort(
    (a, b) => perDriver[b] - perDriver[a],
  );

  const table: TableData = {
    columns: ["Value driver", "Income-statement line", `Annual impact (Y${finalYear})`],
    rows: active.map((d) => [
      sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short),
      DRIVER_PL_LINE[d],
      fmtCurrency(perDriver[d]),
    ]),
  };

  const stats: KeyValue[] = [
    ...(out.revenue > 1 ? [{ label: "→ Revenue ↑", value: fmtCurrency(out.revenue) }] : []),
    ...(out.margin > 1 ? [{ label: "→ Operating expense ↓", value: fmtCurrency(out.margin) }] : []),
    ...(out.loss_avoidance > 1
      ? [{ label: "→ Losses / provisions ↓", value: fmtCurrency(out.loss_avoidance) }]
      : []),
    { label: `= Total P&L impact (Y${finalYear})`, value: fmtCurrency(total) },
  ];

  return {
    id: "financial_rollup",
    kind: "financial_rollup",
    title: "Value to the Financial Statement",
    subtitle: "Where AI value lands on the income statement — for the finance team",
    narrative:
      "The most common CFO question is where AI value actually shows up. Every driver rolls up to a specific income-statement line — top-line revenue, operating-expense reduction, or lower losses — so finance can quantify and own each number.",
    bullets: [
      `${active.length} value drivers roll up to ${lineCount} income-statement lines, totalling ${fmtCurrency(total)} (Y${finalYear})`,
      `Revenue ↑ ${fmtCurrency(out.revenue)} · Operating expense ↓ ${fmtCurrency(out.margin)}${out.loss_avoidance > 1 ? ` · Losses ↓ ${fmtCurrency(out.loss_avoidance)}` : ""}`,
      "Revenue is top-line — apply the company's operating margin for the net-income contribution",
    ],
    stats,
    table,
    speakerNotes:
      "This is the slide for the finance partner. It maps every AI value driver to the income-statement line it moves — revenue, " +
      "operating expense, or losses/provisions — and totals them to a pre-tax P&L impact. The revenue line is top-line; multiply by " +
      "the company's operating margin for the net-income contribution. The total ties to the Business Value headline, so finance can " +
      "trace any number back to its driver and assumptions.",
    assumptionsUsed: [
      "per-driver value (use-case rollup + coding + IT takeout)",
      "outcome routing (reinvestment posture; coding split; IT takeout → margin)",
      "driver → income-statement line mapping",
      `horizonYears (${finalYear})`,
    ],
    order: 0,
    enabled: true,
  };
}
