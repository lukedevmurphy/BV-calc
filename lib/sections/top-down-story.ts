import type { ProposalContext, SectionKind, SectionOutput } from "@/lib/types";
import { topDownMatureValue } from "@/lib/economics/top-down";
import { fmtCurrency, fmtRange } from "@/lib/format";
import { illustrativeFlag } from "@/lib/provenance";

// Narrative sections replaced in top-down with a directional, use-case-aware
// template. use_case_persona is NOT overridden — the real module runs and shows
// the selected use cases (the whole point: "you always need a use case").
const OVERRIDDEN = new Set<SectionKind>([
  "problem",
  "current_state",
  "future_state",
  "product",
  "proposal",
  "roadmap",
  "next_steps",
  "executive_summary",
]);

export function topDownStorySection(
  kind: SectionKind,
  ctx: ProposalContext,
): SectionOutput | undefined {
  if (!OVERRIDDEN.has(kind)) return undefined;
  const labels = ctx.selectedUseCases.length
    ? ctx.selectedUseCases.map((u) => u.label)
    : ["AI workflows (to select)"];
  const total = topDownMatureValue(ctx.valueModel);
  const base = (title: string, subtitle: string): SectionOutput => ({
    id: kind,
    kind,
    title,
    subtitle,
    order: 0,
    enabled: true,
  });

  switch (kind) {
    case "problem":
      return {
        ...base("The Executive Opportunity", `Where AI may create enterprise value at ${ctx.company.name}`),
        bullets: [
          `A directional CFO thesis: AI lifts revenue growth, broken across ${labels.length} candidate use cases`,
          "Built from public financials, not a full discovery — the wide range is a feature, not false precision",
          "Every figure is an assumption to validate; the detailed bottom-up build comes next",
        ],
        stats: [
          { label: "Candidate use cases", value: String(ctx.selectedUseCases.length) },
          { label: "Directional annual value", value: fmtCurrency(total) },
        ],
      };
    case "current_state":
      return {
        ...base("Current-State Opportunities", "Where growth, efficiency, or capacity may be trapped today"),
        table: { columns: ["Use case", "Current executive hypothesis"], rows: labels.map((label) => [label, "Manual effort, cycle time, or constrained capacity to validate"]) },
        bullets: ["High-level opportunities, not yet sized bottom-up — directional only"],
      };
    case "future_state":
      return {
        ...base("Future-State Value Thesis", "How the selected use cases could convert AI capability into value"),
        table: { columns: ["Use case", "Directional value path"], rows: labels.map((label) => [label, "Growth acceleration, operating efficiency, or reinvested capacity"]) },
        bullets: ["The next diligence step is to size the largest use cases bottom-up"],
      };
    case "product":
      return {
        ...base("Platform Fit", "A company-level capability thesis before detailed solution design"),
        bullets: [
          "Enterprise access and governance establish the common platform",
          "Functional leaders validate which use cases deserve deeper discovery",
          "The top-down estimate does not yet prescribe token volumes or detailed sizing",
        ],
      };
    case "proposal":
      return {
        ...base("The Directional Proposal", "Validate the biggest use cases before committing to detailed design"),
        table: { columns: ["Use case", "Validation ask"], rows: labels.map((label) => [label, "Name an executive owner and validate the financial basis"]) },
        bullets: ["The first commitment is executive validation, not a use-case roadmap"],
      };
    case "roadmap":
      return {
        ...base("Roadmap", "Move from directional value to validated initiatives"),
        table: { columns: ["Phase", "Timing", "Outcome"], rows: [
          ["Validate", "Weeks 1–2", "Confirm financial baselines, sources, and owners"],
          ["Decompose", "Weeks 3–4", "Size the largest use cases bottom-up with the client's own volumes"],
          ["Pilot", "Quarter 1", "Test the strongest use case and replace SWAGs with evidence"],
          ["Scale", "Year 1+", "Fund expansion against validated value"],
        ] },
      };
    case "next_steps":
      return {
        ...base("Next Steps", "Turn the CFO-level estimate into a diligence plan"),
        bullets: [
          "Validate the company-level financials and the revenue-growth-lift assumption",
          `Assign executive owners to ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ", and the rest" : ""}`,
          "Decide whether to add direct annual costs or keep the discussion value-only",
          "Move the largest use cases into a bottom-up business case for the next conversation",
        ],
      };
    case "executive_summary": {
      const value = ctx.priorSections.business_value?.rangedFigures?.annualValueFinalYear;
      const coding = ctx.priorSections.coding_efficiency?.rangedFigures?.codingTotalFinalYear;
      const itTakeout = ctx.priorSections.it_takeout?.rangedFigures?.itTakeoutFinalYear;
      const cost = ctx.priorSections.cost?.rangedFigures?.annualCostFinalYear;
      const net = ctx.priorSections.forecast?.rangedFigures?.netFinalYear;
      const flag = illustrativeFlag(ctx.company);
      return {
        ...base("Executive Summary", `Directional AI value thesis for ${ctx.company.name}`),
        bullets: [
          `A directional, top-down estimate broken across ${ctx.selectedUseCases.length} use cases — refined bottom-up next`,
          value ? `Directional annual value at maturity: ${fmtRange(value)}` : "Directional value pending",
          ...(coding && coding.base > 1
            ? [`Of that, engineering coding efficiency contributes ${fmtRange(coding)} — split cost-out / revenue-growth on Settings`]
            : []),
          ...(itTakeout && itTakeout.base > 1
            ? [`IT cost takeout (legacy rationalization) adds ${fmtRange(itTakeout)} — hard-dollar run-rate eliminated`]
            : []),
          cost?.base ? `Direct annual cost entered by the account team: ${fmtRange(cost)}` : "No annual cost entered — this is intentionally a value-only CFO view",
          "The next step is to validate the largest use cases and replace the widest assumptions with evidence",
          ...(flag ? [flag] : []),
        ],
        stats: [
          ...(value ? [{ label: "Annual value", value: fmtRange(value) }] : []),
          ...(coding && coding.base > 1 ? [{ label: "Coding value", value: fmtRange(coding) }] : []),
          ...(itTakeout && itTakeout.base > 1 ? [{ label: "IT takeout", value: fmtRange(itTakeout) }] : []),
          ...(cost ? [{ label: "Annual cost", value: fmtRange(cost) }] : []),
          ...(net ? [{ label: "Net value", value: fmtRange(net) }] : []),
        ],
        rangedFigures: {
          ...(value ? { annualValueFinalYear: value } : {}),
          ...(cost ? { annualCostFinalYear: cost } : {}),
          ...(net ? { netFinalYear: net } : {}),
        },
      };
    }
    default:
      return undefined;
  }
}
