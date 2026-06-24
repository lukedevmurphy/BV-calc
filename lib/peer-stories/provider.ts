import { PEER_STORIES, type PeerStory } from "./data";
import type { SubIndustryId } from "@/lib/value-model/sub-industry";

export interface PeerStoryMatchInput {
  /** Resolved sub-industry of the target company. */
  subIndustryId: SubIndustryId;
  /** The user's selected use-case ids (secondary signal for relevance). */
  useCaseIds: string[];
}

/**
 * Finds the most relevant REAL Anthropic customer story for the target company,
 * or null when none is sufficiently relevant (→ the section is omitted; we never
 * force or fabricate a story).
 *
 * Mirrors EnrichmentProvider / ValuePrefillProvider: an interface + factory with
 * a no-key default. The default is deterministic and backed by a curated index
 * of verified stories. A model-backed LivePeerStoryProvider — which finds
 * Anthropic's current customer-stories page at runtime (search + fetch), caches
 * the index, and uses Claude to rank relevance — slots in at getPeerStoryProvider
 * once the shared model-enrichment infrastructure (server-side key, caching,
 * cost ceilings, silent no-key fallback) lands. It must reuse THAT shared key
 * path, never wire its own.
 */
export interface PeerStoryProvider {
  match(input: PeerStoryMatchInput): PeerStory | null;
}

/** Deterministic default — matches on sub-industry against the curated index. */
export class CuratedPeerStoryProvider implements PeerStoryProvider {
  match({ subIndustryId }: PeerStoryMatchInput): PeerStory | null {
    // Sub-industry match first (the brief's primary key). No fuzzy/forced match:
    // if the curated index has no peer for this sub-industry, omit the section.
    const hits = PEER_STORIES.filter((s) =>
      s.relevantSubIndustries.includes(subIndustryId),
    );
    return hits[0] ?? null;
  }
}

// TODO(model-enrichment): swap to a LivePeerStoryProvider that fetches
// Anthropic's current customer index at runtime and ranks relevance with Claude,
// behind the SHARED key/caching/cost-ceiling path (no second ad-hoc key). Falls
// back to CuratedPeerStoryProvider (and ultimately null) with no key.
export function getPeerStoryProvider(): PeerStoryProvider {
  return new CuratedPeerStoryProvider();
}
