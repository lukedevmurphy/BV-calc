import type { KeyValue, ProposalContext, SectionOutput, TableData } from "@/lib/types";
import {
  activeUsersAtYear,
  annualValue,
  annualValueByUseCase,
  depthAtYear,
  useCaseCoverage,
  valueRealization,
} from "@/lib/economics/engine";
import { topDownMatureValue } from "@/lib/economics/top-down";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/format";

/**
 * "Show your work" appendix slide: the arithmetic behind the Business Value
 * headline, laid out as input × assumption = calculated value. It reuses the
 * SAME engine spine the Business Value section does (never reimplements the
 * ramp/realization math), so every figure here ties out to that slide's base
 * case. Base-case only by design — the conservative / upside band lives on the
 * scenario appendix slides. Defaults into the appendix lane.
 */
export function valueCalculationSection(ctx: ProposalContext): SectionOutput {
  const approach = ctx.assumptions.valueApproach ?? "bottom_up";
  return approach === "top_down" ? topDownCalc(ctx) : bottomUpCalc(ctx);
}

// ── top_down — the multiplicative chain ─────────────────────────────────────
function topDownCalc(ctx: ProposalContext): SectionOutput {
  const { valueModel: vm, company } = ctx;
  const v = resolveSubIndustry(company.industry).topDown;
  const topline = vm.topline;
  const addr = vm.addressableShare.base;
  const uplift = vm.upliftPct.base;
  const rz = vm.realizationFactor.base;
  const t1 = topline * addr;
  const t2 = t1 * uplift;
  const mature = topDownMatureValue(vm); // == t2 * rz, and == business_value base

  const table: TableData = {
    columns: ["Step", "Factor", "Running value"],
    rows: [
      [v.toplineRowLabel, fmtCurrency(topline), fmtCurrency(topline)],
      [`× ${v.addressableRowLabel}`, fmtPercent(addr), fmtCurrency(t1)],
      [`× ${v.upliftRowLabel}`, fmtPercent(uplift), fmtCurrency(t2)],
      [`× ${v.realizationRowLabel}`, fmtPercent(rz), fmtCurrency(mature)],
      ["= Mature annual value", "", fmtCurrency(mature)],
    ],
  };

  return {
    id: "value_calculation",
    kind: "value_calculation",
    title: "Value Calculation",
    subtitle: "How the directional value is derived, step by step",
    narrative:
      "Each headline figure on the Business Value slide is this chain with the base-case inputs plugged in.",
    bullets: [
      `Mature annual value = ${v.toplineRowLabel.toLowerCase()} × ${v.addressableRowLabel.toLowerCase()} × ${v.upliftRowLabel.toLowerCase()} × ${v.realizationRowLabel.toLowerCase()}`,
      "Base-case figures only — the conservative and upside edges are on the scenario appendix slides",
      "The displayed range on the main deck is this base value widened by the top-down confidence band",
    ],
    stats: [{ label: "Mature annual value", value: fmtCurrency(mature) }],
    table,
    speakerNotes:
      "This is the audit trail for the top-down value: one top-line figure scaled by addressable share, " +
      "benchmark uplift and a realization haircut. Every running-value cell is the product of the rows above it.",
    assumptionsUsed: ["topline", "addressableShare", "upliftPct", "realizationFactor"],
    order: 0,
    enabled: true,
  };
}

// ── bottom_up — per use case, then the realization haircut ───────────────────
function bottomUpCalc(ctx: ProposalContext): SectionOutput {
  const { assumptions: a, selectedUseCases } = ctx;
  const finalYear = a.horizonYears;
  const users = activeUsersAtYear(a, finalYear).base;
  const depth = depthAtYear(a, finalYear).base;
  const loaded = a.loadedHourlyCost.base;
  const rz = valueRealization(a).base;
  const cov = useCaseCoverage(a);
  const haircut = rz * cov;
  const rzPct = Math.round(rz * 100);
  const covPct = Math.round(cov * 100);

  // Derive the GROSS (pre-haircut) value per use case from the engine's realized
  // value, so the breakdown can never drift from the Business Value figure:
  // realized_uc = gross_uc × realization × coverage  ⇒  gross_uc = realized_uc / haircut.
  const rows = annualValueByUseCase(a, selectedUseCases, finalYear)
    .map(({ useCase, value }) => {
      const gross = haircut > 0 ? value.base / haircut : value.base;
      // Implied annual hours saved per active user (the rest of the factors are
      // the shared loaded rate and active-user count, shown as stats).
      const hoursPerUser = loaded > 0 && users > 0 ? gross / (loaded * users) : 0;
      return { label: useCase.label, hoursPerUser, gross };
    })
    .sort((x, y) => y.gross - x.gross);

  const grossTotal = rows.reduce((s, r) => s + r.gross, 0);
  const realizedTotal = annualValue(a, selectedUseCases, finalYear).base; // == business_value base

  const table: TableData = {
    columns: ["Use case", `Annual hrs saved / user (Y${finalYear})`, "Gross annual value"],
    rows: [
      ...rows.map((r) => [
        r.label,
        `${Math.round(r.hoursPerUser).toLocaleString("en-US")}h`,
        fmtCurrency(r.gross),
      ]),
      ["All use cases (gross)", "", fmtCurrency(grossTotal)],
    ],
  };

  const stats: KeyValue[] = [
    { label: `Loaded cost`, value: `${fmtCurrency(loaded)}/hr` },
    { label: `Active users (Y${finalYear})`, value: fmtNumber(users) },
    { label: "Realization × coverage", value: `${rzPct}% × ${covPct}%` },
    { label: `Realized annual value (Y${finalYear})`, value: fmtCurrency(realizedTotal) },
  ];

  return {
    id: "value_calculation",
    kind: "value_calculation",
    title: "Value Calculation",
    subtitle: "How the Year-" + finalYear + " business value is built, use case by use case",
    narrative:
      "Each Business Value figure is gross saved-hours value, haircut to a realized dollar amount — the arithmetic is here.",
    bullets: [
      `Gross value per use case = annual hours saved / user × loaded $/hr (${fmtCurrency(loaded)}) × active users (${fmtNumber(users)})`,
      `Realized value = gross × realization (${rzPct}%) × persona coverage (${covPct}%) — the haircut that keeps the value defensible`,
      `Hours include the Year-${finalYear} usage-depth multiplier (${depth.toFixed(2)}×); base-case only, the band is on the scenario slides`,
    ],
    stats,
    table,
    speakerNotes:
      `Audit trail for the bottom-up value. Gross is every saved hour valued at the loaded rate for every active user; ` +
      `realized applies the ${rzPct}% realization rate (a freed hour is only money if it is cut or monetized) and ` +
      `${covPct}% persona coverage (a typical adopter runs only a subset of the selected workflows). ` +
      `Realized total ties to the Business Value Year-${finalYear} base.`,
    assumptionsUsed: [
      "adoptionBreadth",
      "usageDepth",
      "targetUserCount",
      "loadedHourlyCost",
      "per-use-case sizing (hoursSavedPerInstance, instancesPerMonthPerUser)",
      "value realization (offsetRealization / capacityRealization, by reinvestment posture)",
      "useCaseCoverage",
      `horizonYears (${finalYear})`,
    ],
    order: 0,
    enabled: true,
  };
}
