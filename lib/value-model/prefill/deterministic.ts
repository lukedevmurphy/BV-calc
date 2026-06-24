import type { ValueModelInputs } from "@/lib/types";
import { UNCITED } from "@/lib/value-model/constants";
import { resolveSubIndustry } from "../sub-industry";
import type { ValuePrefillInput, ValuePrefillProvider } from "./provider";

/** Fully-loaded annual cost per employee used to size a labor-base top-line
 *  when no revenue figure is available (placeholder — user-editable). */
const ASSUMED_ANNUAL_LOADED_COST = 180_000;

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
    const parsedRevenue = revenue ? parseMoney(revenue.value) : 0;
    // A single current-state actual: the company's revenue highlight if we have
    // one, else a labor-base estimate. The source field records which.
    const topline =
      parsedRevenue || (company.employeeCount ?? 1000) * ASSUMED_ANNUAL_LOADED_COST;
    const toplineSource = parsedRevenue
      ? `Company financial highlight: ${revenue?.label ?? "revenue"}`
      : UNCITED;

    // Sector-aware benchmark priors (still all uncited placeholders).
    // TODO(model-enrichment): a Claude-backed ValuePrefillProvider will replace
    // these deterministic priors with researched, CITED values (read from
    // 10-Ks / sector benchmarks) — populating these exact fields with zero
    // UI/section changes, per the ValuePrefillProvider contract.
    const { priors } = resolveSubIndustry(company.industry);

    return Promise.resolve({
      topline,
      toplineSource,
      addressableShare: priors.addressableShare,
      upliftPct: priors.upliftPct,
      upliftSource: priors.upliftSource,
      realizationFactor: priors.realizationFactor,
      // "Engineering / coding" is intentionally omitted — coding value is the
      // explicit coding-efficiency driver, so a functional pool here would
      // double-count it.
      topDownFunctions: [
        "Sales & marketing",
        "Employee productivity",
        "Operations",
      ],
      topDownAnnualCosts: {},
    });
  }
}
