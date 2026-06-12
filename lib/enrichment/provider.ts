import type { EnrichmentProvider } from "@/lib/types";
import { MockEnrichmentProvider } from "./mock";

/**
 * Provider factory — the single place a real enrichment implementation
 * (web/EDGAR-backed) gets swapped in later. Section modules never import
 * from this directory; they depend only on the CompanyProfile they receive,
 * so a provider swap requires zero section-module changes (spec §10).
 */
export function getEnrichmentProvider(): EnrichmentProvider {
  return new MockEnrichmentProvider();
}
