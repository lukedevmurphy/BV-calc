import type { Ranged, ValueModelInputs } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";
import { resolveSubIndustry } from "../sub-industry";
import type { ValuePrefillInput, ValuePrefillProvider } from "./provider";

/** Fully-loaded annual cost per employee used to size a labor-base top-line
 *  when no revenue figure is available (placeholder — user-editable). */
const ASSUMED_ANNUAL_LOADED_COST = 180_000;

/** Build a band ±pct around a base. */
const band = (base: number, pct: number): Ranged =>
  ranged(Math.round(base * (1 - pct)), Math.round(base), Math.round(base * (1 + pct)));

/** Parse "$3.1B" / "$610M" / "$1,200" into a number; 0 if unparseable. */
function parseMoney(raw: string): number {
  const m = raw.replace(/,/g, "").match(/([\d.]+)\s*([bmk])?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const scale = { b: 1e9, m: 1e6, k: 1e3 }[(m[2] ?? "").toLowerCase()] ?? 1;
  return n * scale;
}

/**
 * Deterministic, no-AI pre-fill. Derives a top-line from the company's revenue
 * highlight (or its labor base) and seeds benchmark % from constants. Every
 * uplift % is stamped `uncited — user to verify` — we never fabricate a source.
 */
export class DeterministicValuePrefillProvider implements ValuePrefillProvider {
  prefill(input: ValuePrefillInput): Promise<ValueModelInputs> {
    const { company } = input;

    const revenue = (company.financialHighlights ?? []).find((h) =>
      /revenue/i.test(h.label),
    );
    const toplineBase = revenue
      ? parseMoney(revenue.value)
      : (company.employeeCount ?? 1000) * ASSUMED_ANNUAL_LOADED_COST;

    const topline = band(toplineBase || 1_000 * ASSUMED_ANNUAL_LOADED_COST, 0.15);

    // Sector-aware benchmark priors (still all uncited placeholders).
    // TODO(model-enrichment): a Claude-backed ValuePrefillProvider will replace
    // these deterministic priors with researched, CITED values (read from
    // 10-Ks / sector benchmarks) — populating these exact fields with zero
    // UI/section changes, per the ValuePrefillProvider contract.
    const { priors } = resolveSubIndustry(company.industry);

    return Promise.resolve({
      topline,
      addressableShare: priors.addressableShare,
      upliftPct: priors.upliftPct,
      upliftSource: priors.upliftSource,
      realizationFactor: priors.realizationFactor,
      topDownFunctions: [
        "Sales & marketing",
        "Engineering / coding",
        "Employee productivity",
        "Operations",
      ],
      topDownAnnualCosts: {},
    });
  }
}
