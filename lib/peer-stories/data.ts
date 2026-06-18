import type { SubIndustryId } from "@/lib/value-model/sub-industry";

// ─────────────────────────────────────────────────────────────────────────────
// Curated index of REAL, ATTRIBUTED Anthropic customer stories.
//
// Every entry here is a real, published story verified against the live source
// at `verifiedOn` (URLs change — confirm before presenting). Outcomes are quoted
// only where the source states them; we never invent a customer, metric, or URL.
// This is the deterministic, no-key default behind PeerStoryProvider — the same
// pattern as the seed companies / FSI agents (real curated data) with a
// model-backed live-fetch provider as the documented swap point.
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerStory {
  id: string;
  /** Real customer name — always shown, never stripped. */
  customer: string;
  /** Sub-industry label as published / understood. */
  industryLabel: string;
  /** Sub-industries this story is a relevant PEER for (match key). */
  relevantSubIndustries: SubIndustryId[];
  /** Our paraphrase of what they do with Claude (not copied verbatim). */
  summary: string;
  /** Published outcomes, each ATTRIBUTED to the customer. Source-stated only. */
  outcomes: { label: string; value: string }[];
  /** A short, verbatim, attributed quote (kept brief — no large copy blocks). */
  quote?: string;
  /** The use-case themes the story demonstrates (for analogy framing). */
  themes: string[];
  sourceUrl: string;
  /** When the story + URL were last verified against the live source. */
  verifiedOn: string;
}

export const PEER_STORIES: PeerStory[] = [
  {
    id: "satispay",
    customer: "Satispay",
    industryLabel: "Payments / fintech",
    relevantSubIndustries: ["card_network"],
    summary:
      "Satispay, a European payments company, runs Claude Code across its Java/Spring " +
      "codebase and Claude for cross-functional teams (finance, legal, ops), plus internal " +
      "subagents for specialized engineering tasks.",
    outcomes: [
      { label: "Satispay — monthly code via Claude", value: "75%+" },
      { label: "Satispay — core service modernization", value: "10× faster" },
      { label: "Satispay — engineer adoption in 30 days", value: "90%+" },
    ],
    quote:
      "10x faster core payment service modernization from a four-week estimate to under four days",
    themes: ["engineering productivity", "operations efficiency", "modernization"],
    sourceUrl: "https://claude.com/customers/satispay",
    verifiedOn: "2026-06-18",
  },
];
