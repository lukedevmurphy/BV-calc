import type { ProposalContext, SectionKind, SectionOutput } from "@/lib/types";
import { topDownMatureValue } from "@/lib/economics/top-down";
import { fmtCurrency, fmtRange } from "@/lib/format";
import { illustrativeFlag } from "@/lib/provenance";

const OVERRIDDEN = new Set<SectionKind>([
  "problem",
  "current_state",
  "future_state",
  "product",
  "use_case_persona",
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
  const functions = ctx.valueModel.topDownFunctions.length
    ? ctx.valueModel.topDownFunctions
    : ["Enterprise productivity"];
  const total = topDownMatureValue(ctx.valueModel);
  const perFunction = total / functions.length;
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
          `This is a directional CFO thesis across ${functions.join(", ")} — not a workflow inventory`,
          "The case starts from company-level financial capacity and tests how much is addressable, improvable, and realizable",
          "Every percentage remains an assumption to validate; the wide range is a feature, not false precision",
        ],
        stats: [
          { label: "Functional value pools", value: String(functions.length) },
          { label: "Directional annual value", value: fmtCurrency(total) },
        ],
      };
    case "current_state":
      return {
        ...base("Current-State Value Pools", "The functions where growth, efficiency, or capacity may be trapped today"),
        table: { columns: ["Function", "Current executive hypothesis"], rows: functions.map((label) => [label, "Manual effort, cycle time, or constrained capacity to validate"]) },
        bullets: ["These are high-level opportunity pools; no individual use case is asserted or sized"],
      };
    case "future_state":
      return {
        ...base("Future-State Value Thesis", "How the selected functions could convert AI capability into financial value"),
        table: { columns: ["Function", "Directional value path"], rows: functions.map((label) => [label, "Growth acceleration, operating efficiency, or reinvested capacity"]) },
        bullets: ["The next diligence step is to decompose the largest pools into measurable initiatives"],
      };
    case "product":
      return {
        ...base("Platform Fit", "A company-level capability thesis before solution or workflow design"),
        bullets: [
          "Enterprise access and governance establish the common platform",
          "Functional leaders validate which pools deserve deeper workflow discovery",
          "The top-down estimate does not prescribe products, agents, or token volumes",
        ],
      };
    case "use_case_persona":
      return {
        ...base("Functional Value Pools", "The directional allocation behind the CFO-level estimate"),
        table: { columns: ["Value pool", "Allocated annual value"], rows: functions.map((label) => [label, fmtCurrency(perFunction)]) },
        stats: [{ label: "Total annual value", value: fmtCurrency(total) }],
        bullets: ["Allocation is equal by default and shapes the discussion; it is not a bottom-up claim"],
      };
    case "proposal":
      return {
        ...base("The Directional Proposal", "Validate the biggest functional pools before committing to detailed design"),
        table: { columns: ["Function", "Directional value", "Validation ask"], rows: functions.map((label) => [label, fmtCurrency(perFunction), "Name an executive owner and validate the financial basis"]) },
        bullets: ["The first commitment is executive validation, not a use-case roadmap"],
      };
    case "roadmap":
      return {
        ...base("Roadmap", "Move from directional value to validated initiatives"),
        table: { columns: ["Phase", "Timing", "Outcome"], rows: [
          ["Validate", "Weeks 1–2", "Confirm financial baselines, sources, and functional owners"],
          ["Decompose", "Weeks 3–4", "Break the largest pools into initiatives and measurable drivers"],
          ["Pilot", "Quarter 1", "Test the strongest initiative and replace SWAGs with evidence"],
          ["Scale", "Year 1+", "Fund expansion against validated value"],
        ] },
      };
    case "next_steps":
      return {
        ...base("Next Steps", "Turn the CFO-level estimate into a diligence plan"),
        bullets: [
          "Validate the company-level financial baseline and every uplift source",
          `Assign executive owners to ${functions.slice(0, 3).join(", ")}${functions.length > 3 ? ", and the remaining pools" : ""}`,
          "Decide whether to add direct annual costs or keep the discussion value-only",
          "Decompose the largest pool into a bottom-up business case only when more precision is useful",
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
          `Company-level value is allocated across ${functions.join(", ")}, plus an explicit engineering coding-efficiency driver`,
          value ? `Directional annual value at maturity: ${fmtRange(value)}` : "Directional value pending",
          ...(coding && coding.base > 1
            ? [`Of that, engineering coding efficiency contributes ${fmtRange(coding)} — split cost-out / revenue-growth on Settings`]
            : []),
          ...(itTakeout && itTakeout.base > 1
            ? [`IT cost takeout (legacy rationalization) adds ${fmtRange(itTakeout)} — hard-dollar run-rate eliminated`]
            : []),
          cost?.base ? `Direct annual cost entered by the account team: ${fmtRange(cost)}` : "No annual cost entered — this is intentionally a value-only CFO view",
          "The next step is to validate the largest pools and replace the widest assumptions with evidence",
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
