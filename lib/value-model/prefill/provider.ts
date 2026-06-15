import type { CompanyProfile, UseCase, ValueApproach, ValueModelInputs } from "@/lib/types";
import { DeterministicValuePrefillProvider } from "./deterministic";

export interface ValuePrefillInput {
  company: CompanyProfile;
  approach: ValueApproach;
  useCases: UseCase[];
}

/**
 * Fills the value-model inputs from blank so the form is never shown empty.
 * Promise-returning so a real AI-backed provider (a server route that prompts
 * Claude and parses structured JSON) can swap in here with ZERO section/UI
 * changes — the exact mirror of EnrichmentProvider (lib/enrichment/provider.ts).
 */
export interface ValuePrefillProvider {
  prefill(input: ValuePrefillInput): Promise<ValueModelInputs>;
}

/** Provider factory — the single swap point. v1 is deterministic (no AI). */
export function getValuePrefillProvider(): ValuePrefillProvider {
  return new DeterministicValuePrefillProvider();
}
