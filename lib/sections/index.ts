// Section registry + the single computation pipeline. Modules are pure and
// synchronous, so this runs identically in the browser (live reflow) and in
// scripts/tests. The executive summary always computes LAST so it can read
// every other section's rangedFigures and headline stats.

import type {
  CompanyProfile,
  ProposalContext,
  ScenarioAssumptions,
  SectionConfigEntry,
  SectionKind,
  SectionOutput,
  UseCase,
  ValueModelInputs,
} from "@/lib/types";
import { DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";
import { problemSection } from "./problem";
import { businessValueSection } from "./business-value";
import { costSection } from "./cost";
import { currentStateSection } from "./current-state";
import { futureStateSection } from "./future-state";
import { productSection } from "./product";
import { useCasePersonaSection } from "./use-case-persona";
import { proposalSection } from "./proposal";
import { forecastSection } from "./forecast";
import { roadmapSection } from "./roadmap";
import { nextStepsSection } from "./next-steps";
import { executiveSummarySection } from "./executive-summary";

/** Default display ordering — executive-deck flow: story first, asks, then
 *  the scenario/cost detail as appendix material (the exporter inserts a
 *  divider before the trailing appendix kinds). */
export const DEFAULT_SECTION_ORDER: SectionKind[] = [
  "executive_summary",
  "problem",
  "current_state",
  "future_state",
  "product",
  "use_case_persona",
  "business_value",
  "proposal",
  "roadmap",
  "next_steps",
  "forecast",
  "cost",
];

/** Kinds that read as appendix detail when they trail the deck. */
export const APPENDIX_KINDS: ReadonlySet<SectionKind> = new Set([
  "forecast",
  "cost",
]);

/** Synchronous module signature used by the registry. The public
 *  SectionModule type allows Promise for future async modules; everything in
 *  v1 is sync so live reflow stays a plain useMemo. */
type SyncSectionModule = (ctx: ProposalContext) => SectionOutput;

const SECTION_MODULES: Record<SectionKind, SyncSectionModule> = {
  executive_summary: executiveSummarySection,
  problem: problemSection,
  current_state: currentStateSection,
  future_state: futureStateSection,
  product: productSection,
  use_case_persona: useCasePersonaSection,
  business_value: businessValueSection,
  proposal: proposalSection,
  cost: costSection,
  forecast: forecastSection,
  roadmap: roadmapSection,
  next_steps: nextStepsSection,
};

/** Dependency-safe computation order: content sections first (economic trio
 *  before sections that reference their figures), exec summary last. */
const COMPUTE_ORDER: SectionKind[] = [
  "problem",
  "current_state",
  "future_state",
  "product",
  "use_case_persona",
  "business_value",
  "cost",
  "forecast",
  "proposal",
  "roadmap",
  "next_steps",
  "executive_summary",
];

export interface ProposalInputs {
  company: CompanyProfile;
  assumptions: ScenarioAssumptions;
  selectedUseCases: UseCase[];
  /** Inputs for the top_down / middle value approaches. Optional — callers
   *  that only exercise the default bottom_up path (scripts, pre-feature saved
   *  payloads) may omit it. */
  valueModel?: ValueModelInputs;
  sectionConfig: SectionConfigEntry[];
}

export function defaultSectionConfig(): SectionConfigEntry[] {
  return DEFAULT_SECTION_ORDER.map((kind, i) => ({
    kind,
    order: i,
    enabled: true,
  }));
}

/**
 * Runs every registered module in dependency order, accumulating
 * priorSections, then stamps order/enabled from sectionConfig. Disabled
 * sections are still COMPUTED (their rangedFigures stay available to the
 * exec summary) — rendering and export filter on `enabled`.
 *
 * Returns sections sorted by configured order.
 */
export function computeAllSections(inputs: ProposalInputs): SectionOutput[] {
  const priorSections: ProposalContext["priorSections"] = {};
  const ctx: ProposalContext = {
    company: inputs.company,
    assumptions: inputs.assumptions,
    selectedUseCases: inputs.selectedUseCases,
    valueModel: inputs.valueModel ?? DEFAULT_VALUE_MODEL,
    priorSections,
  };

  const configByKind = new Map(inputs.sectionConfig.map((c) => [c.kind, c]));
  const outputs: SectionOutput[] = [];

  for (const kind of COMPUTE_ORDER) {
    const module = SECTION_MODULES[kind];
    const config = configByKind.get(kind);
    if (!module || !config) continue;

    const output = module(ctx);
    output.order = config.order;
    output.enabled = config.enabled;
    priorSections[kind] = output;
    outputs.push(output);
  }

  assertSerializable(outputs);
  return outputs.sort((a, b) => a.order - b.order);
}

/** Dev-only wire-format guard: SectionOutput crosses JSON three times (web
 *  state, /api/pptx body, jsonb column). NaN/Infinity stringify to null and
 *  silently corrupt charts — fail loudly here instead. */
function assertSerializable(outputs: SectionOutput[]): void {
  if (process.env.NODE_ENV === "production") return;
  if (JSON.stringify(outputs, jsonNumberGuard).includes("__NON_FINITE__")) {
    throw new Error("SectionOutput contains NaN/Infinity — check engine division paths");
  }
}

function jsonNumberGuard(_key: string, value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return "__NON_FINITE__";
  }
  return value;
}
