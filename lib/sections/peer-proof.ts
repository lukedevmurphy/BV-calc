import type { ProposalContext, SectionOutput } from "@/lib/types";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { getPeerStoryProvider } from "@/lib/peer-stories/provider";

/**
 * Peer Proof — social proof from a REAL, ATTRIBUTED Anthropic customer story
 * matched to the company's sub-industry, with a SEPARATELY-LABELED analogy to
 * the target. Returns null (section omitted) when no sufficiently relevant story
 * exists — never fabricates or force-fits one.
 *
 * THE ATTRIBUTION RULE IS THE DESIGN: the real customer's name, outcomes and
 * source stay clearly theirs; the target parallel is an explicit inference. We
 * never re-skin a real customer's results as the target's.
 */
export function peerProofSection(ctx: ProposalContext): SectionOutput | null {
  const { company, selectedUseCases } = ctx;
  const sub = resolveSubIndustry(company.industry);
  const story = getPeerStoryProvider().match({
    subIndustryId: sub.id,
    useCaseIds: selectedUseCases.map((u) => u.id),
  });
  if (!story) return null; // graceful omit — no relevant peer

  const target = company.name;
  const useCaseHint =
    selectedUseCases
      .slice(0, 2)
      .map((u) => u.label.toLowerCase())
      .join(" and ") || "its core workflows";

  return {
    id: "peer_proof",
    kind: "peer_proof",
    title: "Peer Proof",
    subtitle: `A ${story.industryLabel.toLowerCase()} peer — ${story.customer} — already runs on Claude`,
    // Nugget makes the real/inference split visible (like the seed / Fable flags).
    scenarioTag: "Sourced peer + analogy",
    narrative: story.quote
      ? `${story.customer} reports: “${story.quote}.” (Anthropic-published)`
      : undefined,
    // The outcomes are the CUSTOMER's — each stat label carries their name.
    stats: story.outcomes,
    bullets: [
      `${story.customer} (${story.industryLabel}) — ${story.summary} Published by Anthropic and attributed to ${story.customer}`,
      `These outcomes are ${story.customer}'s, not ${target}'s — ${story.outcomes
        .map((o) => `${o.value} ${o.label.replace(/^.*?— /, "")}`)
        .join("; ")}`,
      // The analogy — clearly labeled as an inference about the target.
      `Why this is relevant to ${target}: as a ${story.industryLabel.toLowerCase()} peer, ${target} runs comparable work at scale, so a similar ${story.themes[0]} pattern could plausibly apply to ${useCaseHint}. This is an analogy, not ${target}'s result`,
      // Provenance flag — real+sourced vs. author inference, visibly separated.
      `Provenance: the story above is Anthropic-published and sourced (verified ${story.verifiedOn}); the ${target} parallel is the proposal author's inference, not a ${story.customer} or ${target} outcome`,
      // Source on-slide as text so it survives into the pptx export.
      `Source (Anthropic-published): ${story.sourceUrl}`,
    ],
    links: [{ label: `${story.customer} story (claude.com)`, url: story.sourceUrl }],
    speakerNotes:
      `Use this as social proof, not as ${target}'s numbers. Lead by naming ${story.customer} and the source — the credibility ` +
      `is that it's real and attributable. Then make the analogy explicitly: a ${story.industryLabel.toLowerCase()} peer saw these ` +
      `results; a comparable pattern could apply to ${target}. Never let ${story.customer}'s outcomes read as ${target}'s. Match is ` +
      `on sub-industry (${sub.label}); confirm the story + URL at ${story.sourceUrl} before presenting.`,
    assumptionsUsed: [
      `peer-story match (sub-industry: ${sub.label})`,
      `real, Anthropic-published story — ${story.customer}, ${story.sourceUrl}`,
      "target parallel is an inference, not the customer's or target's result",
    ],
    order: 0,
    enabled: true,
  };
}
