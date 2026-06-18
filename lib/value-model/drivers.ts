// ─────────────────────────────────────────────────────────────────────────────
// Value-driver layer — the McKinsey-style value tree from
// FS-value-driver-taxonomy.md. Use cases roll up into value drivers; drivers
// roll up into a financial OUTCOME. A use case may feed multiple drivers.
//
//   use case ──(driversForUseCase)──▶ value driver ──(routeToOutcomes)──▶ outcome
//
// The reinvestment toggle (capacity vs offset) re-routes which OUTCOME a
// driver's value lands in — it changes the composition, not the total. The
// engine still owns the totals and bands; this layer only regroups them, so
// the Business Value rangedFigures keys stay identical.
// ─────────────────────────────────────────────────────────────────────────────

export type DriverId =
  | "productivity"
  | "revenue_growth"
  | "cross_sell"
  | "onboarding_speed"
  | "risk_compliance";

/** Where value lands. Capacity routes to revenue/production; offset routes to
 *  margin/cost-out; risk avoidance reads as loss avoidance under capacity. */
export type OutcomeId = "revenue" | "margin" | "loss_avoidance";

export interface ValueDriver {
  id: DriverId;
  label: string;
  /** Compact label for table cells / chips. */
  short: string;
  /** The financial outcome it maps to, in plain terms. */
  outcomeLabel: string;
  capacityOutcome: OutcomeId;
  offsetOutcome: OutcomeId;
  /** Revenue-growth and cross-sell are inherently capacity — "offset" is n/a,
   *  so their value always flows to revenue regardless of the toggle. */
  offsetApplicable: boolean;
}

export const VALUE_DRIVERS: Record<DriverId, ValueDriver> = {
  productivity: {
    id: "productivity",
    label: "Productivity / efficiency",
    short: "Productivity",
    outcomeLabel: "Operating margin (or reinvested capacity)",
    capacityOutcome: "revenue",
    offsetOutcome: "margin",
    offsetApplicable: true,
  },
  revenue_growth: {
    id: "revenue_growth",
    label: "Revenue growth",
    short: "Revenue",
    outcomeLabel: "Top-line revenue",
    capacityOutcome: "revenue",
    offsetOutcome: "revenue",
    offsetApplicable: false,
  },
  cross_sell: {
    id: "cross_sell",
    label: "Cross-sell / up-sell",
    short: "Cross-sell",
    outcomeLabel: "Revenue per customer",
    capacityOutcome: "revenue",
    offsetOutcome: "revenue",
    offsetApplicable: false,
  },
  onboarding_speed: {
    id: "onboarding_speed",
    label: "Onboarding / speed",
    short: "Onboarding",
    outcomeLabel: "Faster revenue + margin",
    capacityOutcome: "revenue",
    offsetOutcome: "margin",
    offsetApplicable: true,
  },
  risk_compliance: {
    id: "risk_compliance",
    label: "Risk / compliance avoidance",
    short: "Risk/compliance",
    outcomeLabel: "Operating margin + loss avoidance",
    capacityOutcome: "loss_avoidance",
    offsetOutcome: "margin",
    offsetApplicable: true,
  },
};

export const DRIVER_ORDER: DriverId[] = [
  "productivity",
  "revenue_growth",
  "cross_sell",
  "onboarding_speed",
  "risk_compliance",
];

export interface Outcome {
  id: OutcomeId;
  label: string;
}

export const OUTCOMES: Record<OutcomeId, Outcome> = {
  revenue: { id: "revenue", label: "Top-line revenue (growth)" },
  margin: { id: "margin", label: "Operating margin (cost-out)" },
  loss_avoidance: { id: "loss_avoidance", label: "Loss / risk avoidance" },
};

/**
 * Use-case → driver(s) mapping. Rows from the taxonomy matrix are mapped to the
 * catalog IDs; the remaining catalog use cases are assigned sensible drivers in
 * the same spirit. Anything unmapped falls back to ["productivity"].
 */
export const USE_CASE_DRIVERS: Record<string, DriverId[]> = {
  // ── from the taxonomy matrix ──
  "awm-meeting-prep": ["productivity", "cross_sell"],
  "awm-rfp-ddq": ["productivity", "revenue_growth"],
  "awm-research-synthesis": ["productivity", "cross_sell"],
  "awm-portfolio-commentary": ["productivity", "onboarding_speed"],
  "awm-kyc-onboarding": ["onboarding_speed", "risk_compliance", "productivity"],
  "awm-reg-monitoring": ["risk_compliance", "productivity"],
  "awm-pitch-books": ["productivity", "revenue_growth"],
  "awm-performance-qa": ["productivity", "cross_sell"],
  "bcm-credit-memos": ["productivity", "onboarding_speed", "risk_compliance"],
  "ops-kyc-screener": ["onboarding_speed", "risk_compliance", "productivity"],
  // ── remaining catalog use cases (same spirit) ──
  "awm-ips-onboarding": ["onboarding_speed", "productivity"],
  "awm-factsheets": ["productivity"],
  "bcm-kyc-refresh": ["risk_compliance", "productivity"],
  "bcm-earnings-notes": ["productivity", "cross_sell"],
  "bcm-deal-docs": ["productivity", "risk_compliance"],
  "ib-pitch-agent": ["productivity", "revenue_growth"],
  "ib-model-builder": ["productivity", "revenue_growth"],
  "ib-meeting-prep": ["productivity", "cross_sell"],
  "er-market-researcher": ["productivity", "cross_sell"],
  "er-earnings-reviewer": ["productivity"],
  "pe-ic-memo": ["productivity", "risk_compliance"],
  "pe-sourcing-screening": ["productivity", "revenue_growth"],
  "fa-valuation-reviewer": ["productivity", "risk_compliance"],
  "fa-gl-reconciler": ["productivity", "risk_compliance"],
  "fa-month-end-close": ["productivity"],
  "fa-statement-auditor": ["productivity", "risk_compliance"],
};

/** Drivers a use case feeds — always ≥1 (falls back to productivity). */
export function driversForUseCase(useCaseId: string): DriverId[] {
  const d = USE_CASE_DRIVERS[useCaseId];
  return d && d.length > 0 ? d : ["productivity"];
}

/** Empty per-driver accumulator. */
export function emptyDriverMap(): Record<DriverId, number> {
  return { productivity: 0, revenue_growth: 0, cross_sell: 0, onboarding_speed: 0, risk_compliance: 0 };
}

/**
 * Roll a per-use-case value up to per-driver value. Each use case's value is
 * split EQUALLY across the drivers it feeds, so the driver totals sum back to
 * the same overall total (the engine's number is preserved exactly).
 */
export function rollupUseCasesToDrivers(
  perUseCase: { id: string; value: number }[],
): Record<DriverId, number> {
  const acc = emptyDriverMap();
  for (const { id, value } of perUseCase) {
    const drivers = driversForUseCase(id);
    const share = value / drivers.length;
    for (const d of drivers) acc[d] += share;
  }
  return acc;
}

/** Allocate a single total across drivers by sector weights (top-down path). */
export function allocateByWeights(
  total: number,
  weights: Record<DriverId, number>,
): Record<DriverId, number> {
  const sum = DRIVER_ORDER.reduce((s, d) => s + (weights[d] ?? 0), 0) || 1;
  const acc = emptyDriverMap();
  for (const d of DRIVER_ORDER) acc[d] = (total * (weights[d] ?? 0)) / sum;
  return acc;
}

/**
 * Re-route per-driver value to financial OUTCOMES using the reinvestment
 * posture (capacityShare 0..1). Capacity-inherent drivers ignore the toggle.
 * Totals are preserved — this only changes the composition.
 */
export function routeToOutcomes(
  driverValues: Record<DriverId, number>,
  capacityShare: number,
): Record<OutcomeId, number> {
  const c = Math.min(1, Math.max(0, capacityShare));
  const out: Record<OutcomeId, number> = { revenue: 0, margin: 0, loss_avoidance: 0 };
  for (const id of DRIVER_ORDER) {
    const v = driverValues[id];
    if (!v) continue;
    const d = VALUE_DRIVERS[id];
    if (!d.offsetApplicable) {
      out[d.capacityOutcome] += v;
    } else {
      out[d.capacityOutcome] += v * c;
      out[d.offsetOutcome] += v * (1 - c);
    }
  }
  return out;
}
