import type { Ranged, ValueModelInputs } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";
import {
  DEFAULT_ADDRESSABLE_SHARE,
  DEFAULT_REALIZATION_FACTOR,
  DEFAULT_UPLIFT_PCT,
  UNCITED,
} from "../constants";
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

    return Promise.resolve({
      topline,
      addressableShare: DEFAULT_ADDRESSABLE_SHARE,
      upliftPct: DEFAULT_UPLIFT_PCT,
      upliftSource: UNCITED,
      realizationFactor: DEFAULT_REALIZATION_FACTOR,
    });
  }
}
