import type { ProposalContext, SectionOutput } from "@/lib/types";
import { fmtRangeTriple } from "@/lib/format";

/**
 * One key use case told from a named persona's point of view — their day,
 * their friction, the before/after. Uses the first selected use case that
 * carries a personaHint.
 */
export function useCasePersonaSection(ctx: ProposalContext): SectionOutput {
  const { selectedUseCases } = ctx;
  const uc = selectedUseCases.find((u) => u.personaHint) ?? selectedUseCases[0];

  if (!uc) {
    return {
      id: "use_case_persona",
      kind: "use_case_persona",
      title: "A Day in the Life",
      bullets: ["Select at least one use case to generate the persona story."],
      order: 0,
      enabled: true,
    };
  }

  const persona = uc.personaHint ?? "A team member";

  return {
    id: "use_case_persona",
    kind: "use_case_persona",
    title: "A Day in the Life",
    subtitle: `${uc.label} — through the eyes of the person who does it`,
    narrative: `${persona}. The work below is real, recurring, and currently hand-built every time.`,
    bullets: [
      `Today: assemble source material from systems and inboxes, re-derive context, draft from scratch, format, double-check — most of it before any judgment is exercised`,
      `Friction: the deadline pressure lands on the assembly, so the judgment gets the leftover time`,
      `With Claude: the assembly and first draft arrive done; the day starts at the review-and-decide step`,
      `After: the same person handles more volume at higher quality — and the hours returned go to clients and analysis, not formatting`,
    ],
    stats: [
      ...(uc.hoursSavedPerInstance
        ? [
            {
              label: "Hours saved / instance",
              value: fmtRangeTriple(uc.hoursSavedPerInstance, (n) => `${n}h`),
            },
          ]
        : []),
      ...(uc.instancesPerMonthPerUser
        ? [
            {
              label: "Instances / month",
              value: fmtRangeTriple(uc.instancesPerMonthPerUser, (n) => `${n}`),
            },
          ]
        : []),
    ],
    speakerNotes:
      `Tell this as a story, not a slide read. If the room contains someone who does this job, hand them the slide and ` +
      `ask "is this your day?" — their correction is more valuable than the slide. Update the sizing knobs with what they say.`,
    assumptionsUsed: [`use case: ${uc.label}`],
    order: 0,
    enabled: true,
  };
}
