import type { ProposalContext, SectionOutput } from "@/lib/types";

// TODO: verify the current Anthropic pre-built template/plugin list on
// anthropic.com at build time — it changes monthly. The mapping below treats
// product fit as "compose pre-built templates + custom," NOT "blank canvas,"
// but the template names are placeholders to confirm before presenting.
const TEMPLATE_HINTS: Record<string, string> = {
  "awm-meeting-prep": "Wealth-management plugin: client briefing / meeting prep",
  "awm-rfp-ddq": "Financial-services template: DDQ / RFP response",
  "awm-research-synthesis": "Equity-research plugin: research synthesis",
  "awm-portfolio-commentary": "Financial-services template: portfolio commentary",
  "awm-kyc-onboarding": "Financial-services template: KYC review",
  "awm-reg-monitoring": "Compliance template: regulatory monitoring",
  "awm-pitch-books": "Financial-services template: pitch-book generation",
  "awm-performance-qa": "Custom agent: performance & attribution Q&A",
};

/** Which Anthropic/Claude products and pre-built templates apply. */
export function productSection(ctx: ProposalContext): SectionOutput {
  const { selectedUseCases } = ctx;

  return {
    id: "product",
    kind: "product",
    title: "Product Fit",
    subtitle: "Start from Anthropic's pre-built financial-services templates — customize only the last mile",
    // Full-width lede (not a left bullet) so the template table spans the slide.
    narrative:
      "Pre-built templates carry built-in best practices and compress time-to-first-value from quarters to weeks; custom work concentrates only where your data and process differ.",
    table: {
      columns: ["Use case", "Suggested starting point"],
      rows: selectedUseCases.map((uc) => [
        uc.label,
        TEMPLATE_HINTS[uc.id] ?? "Custom agent on the Claude API",
      ]),
    },
    speakerNotes:
      `Claude for Enterprise covers every knowledge worker in scope; the Claude API + Agent SDK handle workflow-embedded ` +
      `automation. Anthropic ships verticalized financial-services agent templates (pitch books, DDQs, KYC, research workflows) — ` +
      `start from those, customize the last mile. IMPORTANT: confirm the current template/plugin list on anthropic.com before ` +
      `presenting — it changes monthly and the rows above are placeholders. The strategic point survives any list change: the ` +
      `build is template-first, custom-last, which is why the roadmap's pilot phase is weeks, not quarters.`,
    assumptionsUsed: ["selected use cases"],
    order: 0,
    enabled: true,
  };
}
