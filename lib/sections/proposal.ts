import type { ProposalContext, SectionOutput } from "@/lib/types";
import {
  DRIVER_ORDER,
  VALUE_DRIVERS,
  type DriverId,
} from "@/lib/value-model/drivers";
import { perDriverValues } from "@/lib/value-model/driver-rollup";
import { resolveSubIndustry, sectorDriverLabel } from "@/lib/value-model/sub-industry";
import { fmtCurrency } from "@/lib/format";

/**
 * Value aligned to demand: maps each value DRIVER to the concrete demand it
 * serves and the specific ask that unlocks it. Built from the SAME per-driver
 * rollup the Value Map and Financial Rollup use (use-case value + coding + IT
 * takeout), so every figure — row by row and in total — reconciles exactly with
 * those slides. The first ask is access, not budget.
 */
export function proposalSection(ctx: ProposalContext): SectionOutput {
  const { company, assumptions: a } = ctx;
  const subId = resolveSubIndustry(company.industry).id;
  const perDriver = perDriverValues(ctx);
  const active = DRIVER_ORDER.filter((d) => perDriver[d] > 1).sort(
    (x, y) => perDriver[y] - perDriver[x],
  );
  const total = active.reduce((s, d) => s + perDriver[d], 0);

  return {
    id: "proposal",
    kind: "proposal",
    title: "The Proposal",
    subtitle:
      "The first ask is not budget — it's access: documents, systems, and two hours a week from the people who do the work",
    table: {
      columns: [
        "Value driver",
        `Annual value (Y${a.horizonYears})`,
        "Serves the demand for",
        "What it needs",
      ],
      rows: active.map((d) => [
        sectorDriverLabel(subId, d, VALUE_DRIVERS[d].short),
        fmtCurrency(perDriver[d]),
        demandForDriver(d),
        askForDriver(d),
      ]),
    },
    speakerNotes:
      `Total annual value at maturity: ${fmtCurrency(total)} — the asks are small relative to what they unlock, and these figures ` +
      `reconcile exactly with the Value Map and Financial Rollup (same per-driver rollup). Nothing here is generic AI enthusiasm: ` +
      `every row pairs a value driver you can realize today with the value it returns and the ask that unlocks it. Read the table ` +
      `column by column, not row by row — first establish the demands are real, then the asks look obviously cheap.`,
    assumptionsUsed: [
      "per-driver value (use-case rollup + coding + IT takeout)",
      `horizonYears (${a.horizonYears})`,
    ],
    order: 0,
    enabled: true,
  };
}

function demandForDriver(d: DriverId): string {
  const map: Record<DriverId, string> = {
    productivity: "Capacity in a constrained team",
    revenue_growth: "More producer at-bats and faster sales cycles",
    cross_sell: "Greater share of wallet per client",
    onboarding_speed: "Faster onboarding, lower ops backlog",
    risk_compliance: "Regulatory confidence without compliance sprawl",
    coding_efficiency: "More engineering throughput without headcount",
    it_takeout: "A leaner, cheaper application estate",
  };
  return map[d];
}

function askForDriver(d: DriverId): string {
  const map: Record<DriverId, string> = {
    productivity: "A workflow owner and sample artifacts",
    revenue_growth: "Past proposals/decks + brand templates; a pilot cohort",
    cross_sell: "Client + product data access for the pilot cohort",
    onboarding_speed: "Sample onboarding files + a checklist owner",
    risk_compliance: "Current obligations register",
    coding_efficiency: "Repo access + a lead engineer for the pilot",
    it_takeout: "Application inventory + a sunset owner",
  };
  return map[d];
}
